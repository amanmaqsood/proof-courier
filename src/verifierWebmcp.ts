import type { ProofBundle } from './domain/proofCourier'
import {
  decodeProofBundle,
  getIssuedScholarshipRequest,
  issueScholarshipChallenge,
  SCHOLARSHIP_AUDIENCE,
  SCHOLARSHIP_PURPOSE,
  scholarshipRequirements,
  verifyProofBundle,
} from './domain/proofVerifier'
import { evaluateDisclosureRequest } from './domain/requestFirewall'
import type { ProofTraceEvent, VerifierState } from './proofState'
import type { ChallengeStore } from './verifier/challengeStore'
import { createDynamicManager, emptySchema, errorResult, result } from './webmcpRuntime'

export function registerVerifierTools(bridge: {
  getState: () => VerifierState
  setState: (state: VerifierState) => void
  focusResult: () => void
  recordTrace?: (event: ProofTraceEvent) => void
  challengeStore?: ChallengeStore
}) {
  const inFlightNonces = new Set<string>()
  let challengeRequest: Promise<ReturnType<typeof issueScholarshipChallenge>> | null = null

  async function currentChallenge() {
    const current = bridge.getState()
    const activeChallenge = current.activeChallenge
    const now = Date.now()
    const expectedClaimIds = scholarshipRequirements.map((requirement) => requirement.id).sort()
    const challengeClaimIds = Array.isArray(activeChallenge?.requiredClaimIds)
      ? activeChallenge.requiredClaimIds.map(String)
      : []
    const actualClaimIds = [...new Set(challengeClaimIds)].sort()
    const issuedAt = Date.parse(activeChallenge?.issuedAt ?? '')
    const expiresAt = Date.parse(activeChallenge?.expiresAt ?? '')
    let reusable = Boolean(activeChallenge
      && activeChallenge.audience === SCHOLARSHIP_AUDIENCE
      && activeChallenge.purpose === SCHOLARSHIP_PURPOSE
      && typeof activeChallenge.nonce === 'string'
      && activeChallenge.nonce.length >= 8
      && activeChallenge.nonce.length <= 80
      && activeChallenge.nonce.trim() === activeChallenge.nonce
      && challengeClaimIds.length === expectedClaimIds.length
      && actualClaimIds.length === challengeClaimIds.length
      && JSON.stringify(actualClaimIds) === JSON.stringify(expectedClaimIds)
      && Number.isFinite(issuedAt)
      && Number.isFinite(expiresAt)
      && issuedAt <= now
      && expiresAt > issuedAt
      && expiresAt - issuedAt <= 10 * 60_000
      && expiresAt > now
      && !current.usedNonces.includes(activeChallenge.nonce)
    )
    if (reusable && activeChallenge && bridge.challengeStore) {
      const stored = await bridge.challengeStore.read(activeChallenge.nonce)
      reusable = stored?.status === 'active'
    }
    if (!reusable) {
      const issued = issueScholarshipChallenge()
      await bridge.challengeStore?.issue(issued)
      bridge.setState({
        version: current.version + 1,
        status: 'awaiting_proof',
        activeChallenge: issued,
        usedNonces: current.usedNonces,
      })
      return issued
    }
    return activeChallenge!
  }

  function coalescedCurrentChallenge() {
    if (!challengeRequest) {
      challengeRequest = currentChallenge().finally(() => { challengeRequest = null })
    }
    return challengeRequest
  }

  const tools = [
    {
      name: 'fellowship_get_requirements',
      description: 'Returns the fellowship policy and one active verifier-issued challenge. Repeated calls reuse an active challenge; after expiry or consumption, the call starts a fresh verification attempt and clears the previous attempt result.',
      inputSchema: emptySchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
      execute: async () => result('Five minimum claims are required; raw records are prohibited.', getIssuedScholarshipRequest(await coalescedCurrentChallenge())),
    },
    {
      name: 'fellowship_evaluate_counterproposal',
      description: 'Read-only. Checks whether a wallet counterproposal still satisfies the fellowship while preserving the ten-minute, minimum-disclosure, human-submission boundary.',
      inputSchema: {
        type: 'object',
        properties: {
          audience: { type: 'string', minLength: 1, maxLength: 120 },
          purpose: { type: 'string', minLength: 1, maxLength: 240 },
          claimIds: { type: 'array', items: { type: 'string' }, maxItems: 20, uniqueItems: true },
          nonce: { type: 'string', minLength: 1, maxLength: 80 },
          ttlSeconds: { type: 'number', minimum: 1, maximum: 604800 },
          requestedPrivateFields: { type: 'array', items: { type: 'string' }, maxItems: 20, uniqueItems: true },
          requestsAutomaticSubmission: { type: 'boolean' },
        },
        required: ['audience', 'purpose', 'claimIds', 'nonce', 'ttlSeconds'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false, untrustedContentHint: true },
      execute: (input: Record<string, unknown>) => {
        const decision = evaluateDisclosureRequest({
          audience: String(input.audience),
          purpose: String(input.purpose),
          claimIds: (input.claimIds as unknown[]).map(String),
          nonce: String(input.nonce),
          ttlSeconds: Number(input.ttlSeconds),
          requestedPrivateFields: ((input.requestedPrivateFields as unknown[] | undefined) ?? []).map(String),
          requestsAutomaticSubmission: input.requestsAutomaticSubmission === true,
        })
        const compatible = decision.decision === 'allowed'
        return result(
          compatible ? 'Counterproposal satisfies all published fellowship requirements.' : 'Counterproposal does not satisfy the fellowship boundary.',
          {
            compatible,
            reasonCodes: decision.reasonCodes,
            next: compatible
              ? 'Ask the wallet to prepare this exact request for human review.'
              : 'Return the verifier requirements to the wallet and negotiate again. Do not request consent yet.',
          },
        )
      },
    },
    {
      name: 'fellowship_verify_proof',
      description: 'Verifies a purpose-bound proof bundle for integrity, minimum disclosure, audience, purpose, expiry, and challenge reuse within the active verifier session. It never submits the application.',
      inputSchema: {
        type: 'object',
        properties: { proofBundle: { type: 'string', minLength: 100, description: 'Encoded bundle returned by wallet_export_proof.' } },
        required: ['proofBundle'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
      execute: async ({ proofBundle }: Record<string, unknown>) => {
        const current = bridge.getState()
        let bundle: ProofBundle
        try {
          bundle = decodeProofBundle(String(proofBundle))
        } catch (error) {
          const summary = error instanceof Error ? error.message : 'The proof bundle could not be decoded.'
          const verification = { accepted: false as const, code: 'invalid_envelope' as const, summary, disclosedClaimIds: [] }
          bridge.setState({
            version: current.version + 1,
            status: 'rejected',
            activeChallenge: current.activeChallenge,
            result: verification,
            usedNonces: current.usedNonces,
          })
          bridge.focusResult()
          return errorResult(summary, {
            code: verification.code,
            recover: 'Ask the wallet for a fresh session-scoped proof bundle, then retry verification once.',
            verifierStateChanged: true,
          })
        }
        if (inFlightNonces.has(bundle.nonce)) {
          return errorResult('This proof challenge is already being verified in the current verifier session.', {
            code: 'replayed',
            recover: 'Wait for the current verification result. Do not resend this proof.',
            verifierStateChanged: false,
          })
        }
        inFlightNonces.add(bundle.nonce)
        try {
          let challengeConsumedByStore = false
          if (bridge.challengeStore) {
            if (!current.activeChallenge || current.activeChallenge.nonce !== bundle.nonce) {
              return errorResult('The proof nonce was not issued by the active verifier attempt.', {
                code: 'unissued_nonce',
                recover: 'Read fellowship_get_requirements and ask the wallet for a proof bound to the returned challenge.',
                verifierStateChanged: false,
              })
            }
            const consumption = await bridge.challengeStore.consume({
              nonce: bundle.nonce,
              audience: current.activeChallenge.audience,
              purpose: current.activeChallenge.purpose,
              requiredClaimIds: current.activeChallenge.requiredClaimIds,
              now: new Date().toISOString(),
            })
            if (consumption.status !== 'consumed') {
              const code = consumption.status === 'missing'
                ? 'unissued_nonce'
                : consumption.status === 'expired'
                  ? 'expired'
                  : consumption.status === 'replayed' || consumption.status === 'not_active'
                    ? 'replayed'
                    : 'invalid_challenge'
              return errorResult(
                code === 'replayed'
                  ? 'This verifier challenge has already been consumed.'
                  : code === 'expired'
                    ? 'The verifier challenge expired before it could be consumed.'
                    : 'The active verifier challenge could not be claimed for this proof.',
                {
                  code,
                  recover: 'Read fellowship_get_requirements and use only its fresh active challenge.',
                  verifierStateChanged: false,
                },
              )
            }
            challengeConsumedByStore = true
          }
          let verification = await verifyProofBundle(bundle, {
            now: new Date().toISOString(),
            activeChallenge: current.activeChallenge ?? null,
            usedNonces: new Set(current.usedNonces),
          })
          const verificationFinishedAt = Date.now()
          const challengeExpiresAt = Date.parse(current.activeChallenge?.expiresAt ?? '')
          const proofExpiresAt = Date.parse(bundle.expiresAt)
          const credentialValidUntil = Date.parse(bundle.credential.validUntil)
          if (
            verification.accepted
            && (
              !Number.isFinite(challengeExpiresAt)
              || !Number.isFinite(proofExpiresAt)
              || !Number.isFinite(credentialValidUntil)
              || verificationFinishedAt >= challengeExpiresAt
              || verificationFinishedAt >= proofExpiresAt
              || verificationFinishedAt >= credentialValidUntil
            )
          ) {
            verification = {
              accepted: false,
              code: 'expired',
              summary: 'Proof, credential, or verifier challenge expired before verification completed. Ask the person for a fresh request and consent.',
              disclosedClaimIds: bundle.disclosures.map((proof) => proof.claim.id),
            }
          }
          const latest = bridge.getState()
          if (
            latest.version !== current.version
            || latest.activeChallenge?.nonce !== current.activeChallenge?.nonce
          ) {
            return errorResult('Verifier state changed while the proof was being checked. The stale result was discarded.', {
              code: 'state_changed',
              recover: 'Read fellowship_get_requirements again and use only its current challenge.',
              verifierStateChanged: false,
            })
          }
          const next: VerifierState = verification.accepted
            ? {
                version: latest.version + 1,
                status: 'verified',
                activeChallenge: latest.activeChallenge,
                result: verification,
                proof: bundle,
                usedNonces: [...new Set([...latest.usedNonces, bundle.nonce])],
              }
            : {
                version: latest.version + 1,
                status: 'rejected',
                activeChallenge: latest.activeChallenge,
                result: verification,
                usedNonces: challengeConsumedByStore
                  ? [...new Set([...latest.usedNonces, bundle.nonce])]
                  : latest.usedNonces,
              }
          bridge.setState(next)
          bridge.focusResult()
          if (!verification.accepted) {
            return errorResult(verification.summary, {
              code: verification.code,
              recover: 'Read fellowship_get_requirements, ask the wallet for a fresh matching proof, and retry once.',
              verifierStateChanged: true,
            })
          }
          return result(verification.summary, {
            status: next.status,
            version: next.version,
            issuer: bundle.credential.issuer,
            audience: bundle.audience,
            purpose: bundle.purpose,
            disclosedClaimIds: verification.disclosedClaimIds.filter((id) => id !== 'holder_public_key'),
            privateFieldsReceived: [],
            finalBoundary: 'Only the person can submit the application in the visible verifier UI.',
          })
        } finally {
          inFlightNonces.delete(bundle.nonce)
        }
      },
    },
    {
      name: 'fellowship_get_verification_state',
      description: 'Reads whether a proof passed and whether the person may now submit the synthetic application.',
      inputSchema: emptySchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
      execute: () => result('Current verifier state.', safeVerifierView(bridge.getState())),
    },
    {
      name: 'fellowship_get_verification_receipt',
      description: 'Reads the accepted proof receipt after verification or human submission. It contains no private source values.',
      inputSchema: emptySchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
      execute: () => {
        const current = bridge.getState()
        if (!current.result?.accepted || !current.proof) throw new Error('No accepted verification receipt exists.')
        return result('Verifier receipt contains minimum claims only.', {
          status: current.status,
          issuer: current.proof.credential.issuer,
          nonce: current.proof.nonce,
          disclosedClaimIds: current.result.disclosedClaimIds.filter((id) => id !== 'holder_public_key'),
          privateFieldsReceived: [],
          submittedAt: current.submittedAt,
          version: current.version,
        })
      },
    },
  ]

  return createDynamicManager(
    tools,
    () => {
      const base = ['fellowship_get_requirements', 'fellowship_evaluate_counterproposal', 'fellowship_verify_proof', 'fellowship_get_verification_state']
      return bridge.getState().result?.accepted ? [...base, 'fellowship_get_verification_receipt'] : base
    },
    bridge.recordTrace,
  )
}

function safeVerifierView(state: VerifierState) {
  return {
    version: state.version,
    status: state.status,
    accepted: state.result?.accepted ?? false,
    code: state.result?.code,
    summary: state.result?.summary,
    privateFieldsReceived: [],
    humanSubmissionAvailable: state.status === 'verified',
    submittedAt: state.submittedAt,
  }
}
