import { describe, expect, it } from 'vitest'
import {
  createProofBundle,
  decodeProofBundle,
  encodeProofBundle,
  type ProofBundle,
  type ProofRequest,
} from './proofCourier'
import {
  SCHOLARSHIP_AUDIENCE,
  SCHOLARSHIP_PURPOSE,
  scholarshipRequirements,
  verifyProofBundle,
} from './proofVerifier'

const issuedAt = '2026-09-01T06:00:00.000Z'
const expiresAt = '2026-09-01T06:10:00.000Z'

function request(overrides: Partial<ProofRequest> = {}): ProofRequest {
  return {
    audience: SCHOLARSHIP_AUDIENCE,
    purpose: SCHOLARSHIP_PURPOSE,
    claimIds: scholarshipRequirements.map((requirement) => requirement.id),
    nonce: 'proof-request-001',
    issuedAt,
    expiresAt,
    ...overrides,
  }
}

function clone(bundle: ProofBundle): ProofBundle {
  return structuredClone(bundle)
}

describe('Proof Courier disclosure contract', () => {
  it('verifies the minimum purpose-bound claim bundle', async () => {
    const bundle = await createProofBundle(request())
    const result = await verifyProofBundle(bundle, { now: '2026-09-01T06:05:00.000Z' })

    expect(result).toMatchObject({ accepted: true, code: 'verified' })
    expect(result.disclosedClaimIds).toEqual([
      'age_over_18',
      'active_enrollment',
      'study_field',
      'gpa_band',
      'residency_eligible',
      'holder_public_key',
    ])
  })

  it('keeps private source values outside the exported bundle', async () => {
    const encoded = encodeProofBundle(await createProofBundle(request()))
    const serialized = JSON.stringify(decodeProofBundle(encoded))

    for (const privateValue of ['Maya Rahman', '2004-11-18', 'OBU-447-219', '3.74', '18 Willow Lane']) {
      expect(serialized).not.toContain(privateValue)
      expect(encoded).not.toContain(privateValue)
    }
  })

  it('rejects a claim changed after issuer commitment', async () => {
    const bundle = clone(await createProofBundle(request()))
    bundle.disclosures[0].claim.value = false

    await expect(verifyProofBundle(bundle, { now: issuedAt })).resolves.toMatchObject({
      accepted: false,
      code: 'claim_mismatch',
    })
  })

  it('rejects a proof carried to the wrong audience', async () => {
    const bundle = clone(await createProofBundle(request()))
    bundle.audience = 'different-verifier'

    await expect(verifyProofBundle(bundle, { now: issuedAt })).resolves.toMatchObject({ code: 'wrong_audience' })
  })

  it('rejects a proof repurposed after consent', async () => {
    const bundle = clone(await createProofBundle(request()))
    bundle.purpose = 'Verify eligibility for a loan.'

    await expect(verifyProofBundle(bundle, { now: issuedAt })).resolves.toMatchObject({ code: 'wrong_purpose' })
  })

  it('rejects expiry and one-time nonce replay', async () => {
    const bundle = await createProofBundle(request())

    await expect(verifyProofBundle(bundle, { now: '2026-09-01T06:11:00.000Z' })).resolves.toMatchObject({ code: 'expired' })
    await expect(verifyProofBundle(bundle, { now: issuedAt, usedNonces: new Set([bundle.nonce]) })).resolves.toMatchObject({ code: 'replayed' })
  })

  it('rejects missing claims and over-disclosure', async () => {
    const missing = clone(await createProofBundle(request()))
    missing.disclosures = missing.disclosures.filter((proof) => proof.claim.id !== 'gpa_band')
    await expect(verifyProofBundle(missing, { now: issuedAt })).resolves.toMatchObject({ code: 'missing_claim' })

    const excessive = clone(await createProofBundle(request()))
    excessive.disclosures.push({
      ...structuredClone(excessive.disclosures[0]),
      claim: { id: 'subject_ref', value: 'student-7F3A', salt: 'nova-86' },
    })
    await expect(verifyProofBundle(excessive, { now: issuedAt })).resolves.toMatchObject({ code: 'over_disclosure' })
  })

  it('rejects an envelope changed after the holder approved it', async () => {
    const bundle = clone(await createProofBundle(request()))
    bundle.nonce = 'changed-after-consent'

    await expect(verifyProofBundle(bundle, { now: issuedAt })).resolves.toMatchObject({ code: 'invalid_holder_signature' })
  })

  it('rejects an invalid issuer signature', async () => {
    const bundle = clone(await createProofBundle(request()))
    bundle.issuerSignature = `${bundle.issuerSignature.slice(0, -1)}A`

    await expect(verifyProofBundle(bundle, { now: issuedAt })).resolves.toMatchObject({ code: 'invalid_issuer_signature' })
  })

  it('refuses duplicate or non-consent-safe claim requests', async () => {
    await expect(createProofBundle(request({ claimIds: ['age_over_18', 'age_over_18'] }))).rejects.toThrow('Duplicate')
    await expect(createProofBundle(request({ claimIds: ['subject_ref' as never] }))).rejects.toThrow('outside')
  })
})
