import type { ProofBundle, ProofRequest, VerificationResult } from './domain/proofCourier'

export type ProofTraceEvent = {
  toolName: string
  status: 'succeeded' | 'blocked'
  summary: string
  createdAt: string
}

export type WalletDisclosureDraft = {
  request: ProofRequest
  status: 'prepared' | 'consented' | 'exported' | 'revoked'
  preparedAt: string
  consentedAt?: string
  exportedAt?: string
  revokedAt?: string
  bundle?: ProofBundle
  encodedBundle?: string
}

export type WalletState = {
  version: number
  draft?: WalletDisclosureDraft
}

export type VerifierState = {
  version: number
  status: 'awaiting_proof' | 'verified' | 'rejected' | 'submitted'
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

export function submitVerifiedApplication(state: VerifierState): VerifierState {
  if (state.status !== 'verified' || !state.result?.accepted) throw new Error('A verified minimum proof is required before human submission.')
  return { ...state, version: state.version + 1, status: 'submitted', submittedAt: new Date().toISOString() }
}
