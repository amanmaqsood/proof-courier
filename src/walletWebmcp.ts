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
import type { ProofTraceEvent, WalletState } from './proofState'
import { createDynamicManager, emptySchema, requireVersion, result } from './webmcpRuntime'

export function registerWalletTools(bridge: {
  getState: () => WalletState
  setState: (state: WalletState) => void
  focusConsent: () => void
  recordTrace?: (event: ProofTraceEvent) => void
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
      name: 'wallet_prepare_disclosure',
      description: 'Prepares the minimum fellowship disclosure for visible human review. It does not export any proof.',
      inputSchema: {
        type: 'object',
        properties: {
          audience: { type: 'string', enum: [SCHOLARSHIP_AUDIENCE], description: 'Exact verifier audience returned by fellowship_get_requirements.' },
          purpose: { type: 'string', enum: [SCHOLARSHIP_PURPOSE], description: 'Exact purpose returned by fellowship_get_requirements; it binds consent to this eligibility check.' },
          claimIds: { type: 'array', items: { type: 'string', enum: scholarshipRequirements.map((item) => item.id) }, minItems: 5, maxItems: 5, uniqueItems: true, description: 'Exactly the five minimum derived claim identifiers published by the fellowship verifier; never include raw private fields.' },
          nonce: { type: 'string', minLength: 8, maxLength: 80, description: 'Fresh verifier nonce returned by fellowship_get_requirements; it prevents proof replay.' },
          expectedVersion: { type: 'number', description: 'Current wallet version returned by wallet_get_summary or wallet_get_disclosure_state.' },
        },
        required: ['audience', 'purpose', 'claimIds', 'nonce', 'expectedVersion'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      execute: ({ audience, purpose, claimIds, nonce, expectedVersion }: Record<string, unknown>) => {
        const current = bridge.getState()
        requireVersion(current.version, Number(expectedVersion))
        if (audience !== SCHOLARSHIP_AUDIENCE || purpose !== SCHOLARSHIP_PURPOSE) throw new Error('The request does not match the published fellowship audience and purpose.')
        const requested = [...new Set((claimIds as unknown[]).map(String))].sort()
        const required = scholarshipRequirements.map((item) => item.id).sort()
        if (JSON.stringify(requested) !== JSON.stringify(required)) throw new Error('Prepare exactly the five published minimum claims—no more and no fewer.')
        const now = new Date()
        const request: ProofRequest = {
          audience: SCHOLARSHIP_AUDIENCE,
          purpose: SCHOLARSHIP_PURPOSE,
          claimIds: claimIds as PublicClaimId[],
          nonce: String(nonce),
          issuedAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + 10 * 60_000).toISOString(),
        }
        const next: WalletState = {
          version: current.version + 1,
          draft: { request, status: 'prepared', preparedAt: now.toISOString() },
        }
        bridge.setState(next)
        bridge.focusConsent()
        return result('Five derived claims prepared. Waiting for visible human consent.', safeConsentView(next))
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
      description: 'Exports the one-time purpose-bound proof only after the person approved the exact disclosure in the wallet UI.',
      inputSchema: {
        type: 'object',
        properties: { expectedVersion: { type: 'number', description: 'Current wallet version returned after the person approved the visible disclosure.' } },
        required: ['expectedVersion'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      execute: async ({ expectedVersion }: Record<string, unknown>) => {
        const current = bridge.getState()
        requireVersion(current.version, Number(expectedVersion))
        if (!current.draft || current.draft.status !== 'consented') throw new Error('Export is unavailable until the person approves the visible disclosure card.')
        const bundle = await createProofBundle(current.draft.request)
        const encodedBundle = encodeProofBundle(bundle)
        const exportedAt = new Date().toISOString()
        const next: WalletState = {
          version: current.version + 1,
          draft: { ...current.draft, status: 'exported', bundle, encodedBundle, exportedAt },
        }
        bridge.setState(next)
        return result('Purpose-bound proof exported once. Private source values were not included.', {
          proofBundle: encodedBundle,
          audience: bundle.audience,
          purpose: bundle.purpose,
          nonce: bundle.nonce,
          expiresAt: bundle.expiresAt,
          disclosedClaimIds: bundle.disclosures.map((proof) => proof.claim.id).filter((id) => id !== 'holder_public_key'),
          privateFieldsDisclosed: [],
          next: 'Open the fellowship verifier tab and call fellowship_verify_proof with this proofBundle.',
        })
      },
    },
    {
      name: 'wallet_get_disclosure_receipt',
      description: 'Reads the human consent and one-time export receipt without returning the proof token or private values.',
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
      const base = ['wallet_get_summary', 'wallet_prepare_disclosure', 'wallet_get_disclosure_state']
      if (status === 'consented') return [...base, 'wallet_export_proof']
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
    exportAvailable: state.draft?.status === 'consented',
    privateFieldsDisclosed: [],
    humanActionRequired: state.draft?.status === 'prepared',
  }
}
