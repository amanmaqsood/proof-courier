import { afterEach, describe, expect, it } from 'vitest'
import {
  createProofBundle,
  decodeProofBundle,
  encodeProofBundle,
  type ProofBundle,
  type ProofRequest,
} from '../domain/proofCourier'
import {
  SCHOLARSHIP_AUDIENCE,
  SCHOLARSHIP_PURPOSE,
  scholarshipRequirements,
  verifyProofBundle,
} from '../domain/proofVerifier'
import {
  consentToWalletDraft,
  createVerifierState,
  createWalletState,
  type VerifierState,
  type WalletState,
} from '../proofState'
import { registerVerifierTools } from '../verifierWebmcp'
import { registerWalletTools } from '../walletWebmcp'

type RegisteredTool = { name: string; execute: (input: Record<string, unknown>) => unknown | Promise<unknown> }

const issuedAt = '2026-09-01T06:00:00.000Z'
const expiresAt = '2026-09-01T06:10:00.000Z'

function request(overrides: Partial<ProofRequest> = {}): ProofRequest {
  return {
    audience: SCHOLARSHIP_AUDIENCE,
    purpose: SCHOLARSHIP_PURPOSE,
    claimIds: scholarshipRequirements.map((item) => item.id),
    nonce: 'judge-eval-nonce-001',
    issuedAt,
    expiresAt,
    ...overrides,
  }
}

function clone(bundle: ProofBundle): ProofBundle {
  return structuredClone(bundle)
}

function installRegistry() {
  const tools = new Map<string, RegisteredTool>()
  Object.defineProperty(document, 'modelContext', {
    configurable: true,
    value: {
      registerTool(tool: RegisteredTool, options?: { signal?: AbortSignal }) {
        tools.set(tool.name, tool)
        options?.signal?.addEventListener('abort', () => tools.delete(tool.name), { once: true })
      },
    },
  })
  return tools
}

afterEach(() => {
  delete document.modelContext
})

describe('Proof Courier judge scenarios', () => {
  it('E1 accepts one valid minimum-disclosure presentation', async () => {
    const result = await verifyProofBundle(await createProofBundle(request()), { now: '2026-09-01T06:05:00.000Z' })
    expect(result).toMatchObject({ accepted: true, code: 'verified' })
  })

  it('E2 proves raw identity values never enter the courier bundle', async () => {
    const token = encodeProofBundle(await createProofBundle(request()))
    const serialized = JSON.stringify(decodeProofBundle(token))
    for (const value of ['Maya Rahman', '2004-11-18', 'OBU-447-219', 'openbridge-2026-7F3A', '3.74', '18 Willow Lane']) {
      expect(token).not.toContain(value)
      expect(serialized).not.toContain(value)
    }
  })

  it('E3 rejects a presentation sent to a different audience', async () => {
    const bundle = clone(await createProofBundle(request()))
    bundle.audience = 'other-verifier'
    await expect(verifyProofBundle(bundle, { now: issuedAt })).resolves.toMatchObject({ accepted: false, code: 'wrong_audience' })
  })

  it('E4 rejects a presentation repurposed after consent', async () => {
    const bundle = clone(await createProofBundle(request()))
    bundle.purpose = 'Decide whether to issue a loan.'
    await expect(verifyProofBundle(bundle, { now: issuedAt })).resolves.toMatchObject({ code: 'wrong_purpose' })
  })

  it('E5 rejects an expired presentation', async () => {
    const bundle = await createProofBundle(request())
    await expect(verifyProofBundle(bundle, { now: '2026-09-01T06:11:00.000Z' })).resolves.toMatchObject({ code: 'expired' })
  })

  it('E6 rejects a replayed one-time nonce', async () => {
    const bundle = await createProofBundle(request())
    await expect(verifyProofBundle(bundle, { now: issuedAt, usedNonces: new Set([bundle.nonce]) })).resolves.toMatchObject({ code: 'replayed' })
  })

  it('E7 rejects a missing required eligibility claim', async () => {
    const bundle = clone(await createProofBundle(request()))
    bundle.disclosures = bundle.disclosures.filter((item) => item.claim.id !== 'gpa_band')
    await expect(verifyProofBundle(bundle, { now: issuedAt })).resolves.toMatchObject({ code: 'missing_claim' })
  })

  it('E8 rejects a claim the verifier did not request', async () => {
    const bundle = clone(await createProofBundle(request()))
    bundle.disclosures.push({
      ...structuredClone(bundle.disclosures[0]),
      claim: { id: 'subject_ref', value: 'student-7F3A', salt: 'nova-86' },
    })
    await expect(verifyProofBundle(bundle, { now: issuedAt })).resolves.toMatchObject({ code: 'over_disclosure' })
  })

  it('E9 rejects a derived claim changed after issuer commitment', async () => {
    const bundle = clone(await createProofBundle(request()))
    bundle.disclosures[0].claim.value = false
    await expect(verifyProofBundle(bundle, { now: issuedAt })).resolves.toMatchObject({ code: 'claim_mismatch' })
  })

  it('E10 rejects a forged issuer signature', async () => {
    const bundle = clone(await createProofBundle(request()))
    bundle.issuerSignature = `${bundle.issuerSignature.slice(0, -1)}A`
    await expect(verifyProofBundle(bundle, { now: issuedAt })).resolves.toMatchObject({ code: 'invalid_issuer_signature' })
  })

  it('E11 rejects an envelope changed after holder consent', async () => {
    const bundle = clone(await createProofBundle(request()))
    bundle.nonce = 'mutated-after-consent'
    await expect(verifyProofBundle(bundle, { now: issuedAt })).resolves.toMatchObject({ code: 'invalid_holder_signature' })
  })

  it('E12 refuses duplicate or internal claim requests', async () => {
    await expect(createProofBundle(request({ claimIds: ['age_over_18', 'age_over_18'] }))).rejects.toThrow('Duplicate')
    await expect(createProofBundle(request({ claimIds: ['subject_ref' as never] }))).rejects.toThrow('outside')
  })

  it('E13 keeps the export capability absent until a visible human action', async () => {
    const tools = installRegistry()
    let wallet: WalletState = createWalletState()
    const manager = registerWalletTools({
      getState: () => wallet,
      setState: (next) => { wallet = next },
      focusConsent: () => undefined,
    })
    await tools.get('wallet_prepare_disclosure')!.execute({
      audience: SCHOLARSHIP_AUDIENCE,
      purpose: SCHOLARSHIP_PURPOSE,
      claimIds: scholarshipRequirements.map((item) => item.id),
      nonce: 'judge-consent-001',
      expectedVersion: 1,
    })
    manager.sync()
    expect(tools.has('wallet_export_proof')).toBe(false)
    wallet = consentToWalletDraft(wallet)
    manager.sync()
    expect(tools.has('wallet_export_proof')).toBe(true)
    manager.dispose()
  })

  it('E14 withdraws export after one call and exposes a safe receipt', async () => {
    const tools = installRegistry()
    let wallet: WalletState = createWalletState()
    const manager = registerWalletTools({
      getState: () => wallet,
      setState: (next) => { wallet = next },
      focusConsent: () => undefined,
    })
    await tools.get('wallet_prepare_disclosure')!.execute({
      audience: SCHOLARSHIP_AUDIENCE,
      purpose: SCHOLARSHIP_PURPOSE,
      claimIds: scholarshipRequirements.map((item) => item.id),
      nonce: 'judge-export-001',
      expectedVersion: 1,
    })
    wallet = consentToWalletDraft(wallet)
    manager.sync()
    await tools.get('wallet_export_proof')!.execute({ expectedVersion: 3 })
    manager.sync()
    expect(tools.has('wallet_export_proof')).toBe(false)
    expect(tools.has('wallet_get_disclosure_receipt')).toBe(true)
    manager.dispose()
  })

  it('E15 offers no agent consent, approval, or final submission tool', () => {
    const tools = installRegistry()
    let verifier: VerifierState = createVerifierState()
    const manager = registerVerifierTools({
      getState: () => verifier,
      setState: (next) => { verifier = next },
      focusResult: () => undefined,
    })
    expect([...tools.keys()].some((name) => /consent|approve|submit/u.test(name))).toBe(false)
    manager.dispose()
  })
})
