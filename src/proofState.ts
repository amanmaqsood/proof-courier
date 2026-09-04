import type { IssuedProofChallenge, ProofBundle, ProofRequest, VerificationResult } from './domain/proofCourier'

export type ProofTraceEvent = {
  toolName: string
  status: 'succeeded' | 'blocked'
  summary: string
  createdAt: string
}

export type WalletDisclosureDraft = {
  request: ProofRequest
  status: 'prepared' | 'consented' | 'exporting' | 'exported' | 'revoked' | 'expired' | 'failed_closed'
  preparedAt: string
  consentedAt?: string
  exportStartedAt?: string
  exportOperationId?: string
  exportedAt?: string
  exportFailedAt?: string
  revokedAt?: string
  expiredAt?: string
}

export type WalletState = {
  version: number
  draft?: WalletDisclosureDraft
}

export type VerifierState = {
  version: number
  status: 'awaiting_proof' | 'verified' | 'rejected' | 'submitted'
  activeChallenge?: IssuedProofChallenge
  result?: VerificationResult
  proof?: ProofBundle
  usedNonces: string[]
  submittedAt?: string
}

export function createWalletState(): WalletState {
  return { version: 1 }
}

export function createVerifierState(): VerifierState {
  return { version: 1, status: 'awaiting_proof', usedNonces: [] }
}

export function consentToWalletDraft(state: WalletState): WalletState {
  if (!state.draft || state.draft.status !== 'prepared') throw new Error('There is no prepared disclosure to approve.')
  if (isWalletDraftExpired(state)) throw new Error('This disclosure request has expired. Prepare a fresh verifier request before approving.')
  return {
    version: state.version + 1,
    draft: { ...state.draft, status: 'consented', consentedAt: new Date().toISOString() },
  }
}

export function revokeWalletDraft(state: WalletState): WalletState {
  if (!state.draft || !['prepared', 'consented'].includes(state.draft.status)) throw new Error('This disclosure can no longer be revoked.')
  return {
    version: state.version + 1,
    draft: { ...state.draft, status: 'revoked', revokedAt: new Date().toISOString() },
  }
}

export function claimWalletExport(state: WalletState): WalletState {
  if (!state.draft || state.draft.status !== 'consented') throw new Error('Export is unavailable until the person approves the visible disclosure card.')
  if (isWalletDraftExpired(state)) throw new Error('This disclosure request expired before export. Prepare and approve a fresh verifier request.')
  return {
    version: state.version + 1,
    draft: {
      ...state.draft,
      status: 'exporting',
      exportStartedAt: new Date().toISOString(),
      exportOperationId: crypto.randomUUID(),
    },
  }
}

export function completeWalletExport(
  state: WalletState,
  expectedOperationId: string,
): WalletState {
  if (
    !state.draft
    || state.draft.status !== 'exporting'
    || state.draft.exportOperationId !== expectedOperationId
  ) throw new Error('The current session export claim is no longer active.')
  if (isWalletDraftExpired(state)) throw new Error('This disclosure request expired while the proof was being prepared.')
  return {
    version: state.version + 1,
    draft: {
      ...state.draft,
      status: 'exported',
      exportedAt: new Date().toISOString(),
    },
  }
}

export function failWalletExportClosed(state: WalletState, expectedOperationId: string): WalletState {
  if (
    !state.draft
    || state.draft.status !== 'exporting'
    || state.draft.exportOperationId !== expectedOperationId
  ) throw new Error('The current session export claim is no longer active.')
  return {
    version: state.version + 1,
    draft: { ...state.draft, status: 'failed_closed', exportFailedAt: new Date().toISOString() },
  }
}

export function isWalletDraftExpired(state: WalletState, now = new Date()) {
  if (!state.draft) return false
  const expiresAt = Date.parse(state.draft.request.expiresAt)
  return !Number.isFinite(expiresAt) || expiresAt <= now.getTime()
}

export function expireWalletDraft(state: WalletState, now = new Date()): WalletState {
  if (
    !state.draft
    || !['prepared', 'consented'].includes(state.draft.status)
    || !isWalletDraftExpired(state, now)
  ) return state
  return {
    version: state.version + 1,
    draft: { ...state.draft, status: 'expired', expiredAt: now.toISOString() },
  }
}

export function submitVerifiedApplication(state: VerifierState): VerifierState {
  if (state.status !== 'verified' || !state.result?.accepted) throw new Error('A verified minimum proof is required before human submission.')
  return { ...state, version: state.version + 1, status: 'submitted', submittedAt: new Date().toISOString() }
}
