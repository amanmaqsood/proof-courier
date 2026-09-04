import {
  SCHOLARSHIP_AUDIENCE,
  SCHOLARSHIP_PURPOSE,
  createProofBundle,
  encodeProofBundle,
  getWalletSummary,
  scholarshipRequirements,
  type ProofRequest,
  type PublicClaimId,
} from './domain/proofCourier'
import { evaluateDisclosureRequest } from './domain/requestFirewall'
import {
  claimWalletExport,
  completeWalletExport,
  expireWalletDraft,
  failWalletExportClosed,
  isWalletDraftExpired,
  type ProofTraceEvent,
  type WalletState,
} from './proofState'
import type { WalletGrantStore } from './wallet/walletGrantStore'
import { createDynamicManager, emptySchema, requireVersion, result } from './webmcpRuntime'

export function registerWalletTools(bridge: {
  getState: () => WalletState
  setState: (state: WalletState) => void
  focusConsent: () => void
  recordTrace?: (event: ProofTraceEvent) => void
  grantStore?: WalletGrantStore
}) {
  const tools = [
    {
      name: 'wallet_get_summary',
      description: 'Reads a privacy-safe summary of the synthetic credential wallet without returning private source values.',
      inputSchema: emptySchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false, untrustedContentHint: true },
      execute: () => result('Private values remain inside the wallet.', { ...getWalletSummary(), version: bridge.getState().version }),
    },
    {
      name: 'wallet_evaluate_request',
      description: 'Read-only Request Firewall. Checks a proposed verifier request for raw fields, excess claims, unsafe purpose or audience, excessive lifetime, and automatic submission. It releases nothing and returns a minimum-disclosure counterproposal when possible.',
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
        return result(decision.summary, decision)
      },
    },
    {
      name: 'wallet_prepare_disclosure',
      description: 'Prepares the minimum fellowship disclosure for visible human review. It does not export any proof.',
      inputSchema: {
        type: 'object',
        properties: {
          audience: { type: 'string', enum: [SCHOLARSHIP_AUDIENCE], description: 'Exact verifier audience returned by fellowship_get_requirements.' },
          purpose: { type: 'string', enum: [SCHOLARSHIP_PURPOSE], description: 'Exact purpose returned by fellowship_get_requirements; it binds consent to this eligibility check.' },
          claimIds: { type: 'array', items: { type: 'string', enum: scholarshipRequirements.map((item) => item.id) }, minItems: 5, maxItems: 5, uniqueItems: true, description: 'Exactly the five minimum derived claim identifiers published by the fellowship verifier; never include raw private fields.' },
          nonce: { type: 'string', minLength: 8, maxLength: 80, description: 'Fresh verifier challenge returned by fellowship_get_requirements; the current verifier session rejects unknown or reused values.' },
          challengeExpiresAt: { type: 'string', format: 'date-time', description: 'Absolute challenge expiry returned by fellowship_get_requirements. The wallet will never extend it.' },
          expectedVersion: { type: 'number', description: 'Current wallet version returned by wallet_get_summary or wallet_get_disclosure_state.' },
        },
        required: ['audience', 'purpose', 'claimIds', 'nonce', 'challengeExpiresAt', 'expectedVersion'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
      execute: async ({ audience, purpose, claimIds, nonce, challengeExpiresAt, expectedVersion }: Record<string, unknown>) => {
        const current = bridge.getState()
        requireVersion(current.version, Number(expectedVersion))
        if (audience !== SCHOLARSHIP_AUDIENCE || purpose !== SCHOLARSHIP_PURPOSE) throw new Error('The request does not match the published fellowship audience and purpose.')
        const requested = [...new Set((claimIds as unknown[]).map(String))].sort()
        const required = scholarshipRequirements.map((item) => item.id).sort()
        if (JSON.stringify(requested) !== JSON.stringify(required)) throw new Error('Prepare exactly the five published minimum claims—no more and no fewer.')
        const now = new Date()
        const verifierExpiry = Date.parse(String(challengeExpiresAt))
        if (!Number.isFinite(verifierExpiry) || verifierExpiry <= now.getTime()) {
          throw new Error('The verifier challenge expiry is invalid or has already passed. Read fellowship_get_requirements again.')
        }
        const walletExpiry = now.getTime() + 10 * 60_000
        const request: ProofRequest = {
          audience: SCHOLARSHIP_AUDIENCE,
          purpose: SCHOLARSHIP_PURPOSE,
          claimIds: claimIds as PublicClaimId[],
          nonce: String(nonce),
          issuedAt: now.toISOString(),
          expiresAt: new Date(Math.min(verifierExpiry, walletExpiry)).toISOString(),
        }
        const next: WalletState = {
          version: current.version + 1,
          draft: { request, status: 'prepared', preparedAt: now.toISOString() },
        }
        const committed = bridge.grantStore
          ? await bridge.grantStore.compareAndSet(current.version, next)
          : next
        bridge.setState(committed)
        bridge.focusConsent()
        return result('Five derived claims prepared. Waiting for visible human consent.', safeConsentView(committed))
      },
    },
    {
      name: 'wallet_get_disclosure_state',
      description: 'Read-only. Reports which derived claims are prepared, whether a person consented, and whether export is currently available; it never changes consent or exports proof.',
      inputSchema: emptySchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
      execute: () => result('Current wallet consent state.', safeConsentView(bridge.getState())),
    },
    {
      name: 'wallet_export_proof',
      description: 'Atomically claims the durable same-origin wallet grant to export a purpose-bound proof only after the person approved the exact disclosure in the wallet UI.',
      inputSchema: {
        type: 'object',
        properties: { expectedVersion: { type: 'number', description: 'Current wallet version returned after the person approved the visible disclosure.' } },
        required: ['expectedVersion'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
      execute: async ({ expectedVersion }: Record<string, unknown>) => {
        const current = bridge.getState()
        requireVersion(current.version, Number(expectedVersion))
        if (isWalletDraftExpired(current)) {
          const expired = expireWalletDraft(current)
          if (expired !== current) {
            const committed = bridge.grantStore
              ? await bridge.grantStore.compareAndSet(current.version, expired)
              : expired
            bridge.setState(committed)
          }
          throw new Error('This disclosure request expired before export. Prepare and approve a fresh verifier request.')
        }
        const claimed = bridge.grantStore
          ? await bridge.grantStore.claimExport(current.version)
          : claimWalletExport(current)
        const operationId = claimed.draft!.exportOperationId!
        bridge.setState(claimed)

        try {
          const bundle = await createProofBundle(claimed.draft!.request, claimed.draft!.consentedAt)
          const encodedBundle = encodeProofBundle(bundle)
          const latest = bridge.grantStore
            ? await bridge.grantStore.read()
            : bridge.getState()
          requireVersion(latest.version, claimed.version)
          if (latest.draft?.exportOperationId !== operationId) {
            throw new Error('Wallet export authority changed while the proof was being prepared. Start again from the current wallet state.')
          }
          const next = completeWalletExport(latest, operationId)
          const committed = bridge.grantStore
            ? await bridge.grantStore.compareAndSet(latest.version, next)
            : next
          bridge.setState(committed)
          return result('Purpose-bound proof exported under the atomically claimed wallet grant. Private source values were not included.', {
            proofBundle: encodedBundle,
            audience: bundle.audience,
            purpose: bundle.purpose,
            nonce: bundle.nonce,
            expiresAt: bundle.expiresAt,
            disclosedClaimIds: bundle.disclosures.map((proof) => proof.claim.id).filter((id) => id !== 'holder_public_key'),
            privateFieldsDisclosed: [],
            next: 'Open the fellowship verifier tab and call fellowship_verify_proof with this proofBundle.',
          })
        } catch (error) {
          const latest = bridge.grantStore
            ? await bridge.grantStore.read()
            : bridge.getState()
          if (
            latest.version === claimed.version
            && latest.draft?.status === 'exporting'
            && latest.draft.exportOperationId === operationId
          ) {
            const failed = failWalletExportClosed(latest, operationId)
            try {
              const committed = bridge.grantStore
                ? await bridge.grantStore.compareAndSet(latest.version, failed)
                : failed
              bridge.setState(committed)
            } catch {
              // A competing state transition already withdrew or replaced this authority.
            }
          }
          throw error
        }
      },
    },
    {
      name: 'wallet_get_disclosure_receipt',
      description: 'Reads the human consent and current-session export receipt without returning the proof token or private values.',
      inputSchema: emptySchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
      execute: () => {
        const current = bridge.getState()
        if (!current.draft || current.draft.status !== 'exported') throw new Error('No disclosure receipt exists yet.')
        return result('Disclosure receipt confirms minimum release with no private source values.', {
          status: current.draft.status,
          audience: current.draft.request.audience,
          purpose: current.draft.request.purpose,
          claimIds: current.draft.request.claimIds,
          consentedAt: current.draft.consentedAt,
          exportedAt: current.draft.exportedAt,
          privateFieldsDisclosed: [],
          version: current.version,
        })
      },
    },
  ]

  return createDynamicManager(
    tools,
    () => {
      const status = bridge.getState().draft?.status
      const base = ['wallet_get_summary', 'wallet_evaluate_request', 'wallet_prepare_disclosure', 'wallet_get_disclosure_state']
      if (status === 'consented' && !isWalletDraftExpired(bridge.getState())) return [...base, 'wallet_export_proof']
      if (status === 'exported') return [...base, 'wallet_get_disclosure_receipt']
      return base
    },
    bridge.recordTrace,
  )
}

function safeConsentView(state: WalletState) {
  return {
    version: state.version,
    status: state.draft?.status ?? 'no_request',
    audience: state.draft?.request.audience,
    purpose: state.draft?.request.purpose,
    claimIds: state.draft?.request.claimIds ?? [],
    expiresAt: state.draft?.request.expiresAt,
    exportAvailable: state.draft?.status === 'consented' && !isWalletDraftExpired(state),
    privateFieldsDisclosed: [],
    humanActionRequired: state.draft?.status === 'prepared',
  }
}
