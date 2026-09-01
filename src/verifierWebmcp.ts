import type { ProofBundle } from './domain/proofCourier'
import {
  decodeProofBundle,
  getScholarshipRequest,
  verifyProofBundle,
} from './domain/proofVerifier'
import type { ProofTraceEvent, VerifierState } from './proofState'
import { createDynamicManager, emptySchema, result } from './webmcpRuntime'

export function registerVerifierTools(bridge: {
  getState: () => VerifierState
  setState: (state: VerifierState) => void
  focusResult: () => void
  recordTrace?: (event: ProofTraceEvent) => void
}) {
  const tools = [
    {
      name: 'fellowship_get_requirements',
      description: 'Reads the fellowship verifier audience, purpose, nonce, minimum derived claims, prohibited private fields, and human-only submission boundary.',
      inputSchema: emptySchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
      execute: () => result('Five minimum claims are required; raw records are prohibited.', getScholarshipRequest()),
    },
    {
      name: 'fellowship_verify_proof',
      description: 'Verifies a purpose-bound proof bundle for integrity, minimum disclosure, audience, purpose, expiry, and replay. It never submits the application.',
      inputSchema: {
        type: 'object',
        properties: { proofBundle: { type: 'string', minLength: 100, description: 'Encoded bundle returned by wallet_export_proof.' } },
        required: ['proofBundle'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      execute: async ({ proofBundle }: Record<string, unknown>) => {
        const current = bridge.getState()
        let bundle: ProofBundle
        try {
          bundle = decodeProofBundle(String(proofBundle))
        } catch (error) {
          throw new Error(error instanceof Error ? error.message : 'The proof bundle could not be decoded.', { cause: error })
        }
        const verification = await verifyProofBundle(bundle, { now: new Date().toISOString(), usedNonces: new Set(current.usedNonces) })
        const next: VerifierState = verification.accepted
          ? { version: current.version + 1, status: 'verified', result: verification, proof: bundle, usedNonces: [...current.usedNonces, bundle.nonce] }
          : { ...current, version: current.version + 1, status: 'rejected', result: verification }
        bridge.setState(next)
        bridge.focusResult()
        if (!verification.accepted) throw new Error(`${verification.code}: ${verification.summary}`)
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
      const base = ['fellowship_get_requirements', 'fellowship_verify_proof', 'fellowship_get_verification_state']
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
