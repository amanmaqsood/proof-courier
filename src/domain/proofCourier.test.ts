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

function toBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')
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

  it('rejects malformed, future-issued, or overlong proof lifetimes', async () => {
    const malformed = clone(await createProofBundle(request()))
    malformed.expiresAt = 'not-a-date'
    await expect(verifyProofBundle(malformed, { now: issuedAt })).resolves.toMatchObject({ code: 'invalid_timestamps' })

    const future = clone(await createProofBundle(request()))
    future.issuedAt = '2026-09-01T07:00:00.000Z'
    await expect(verifyProofBundle(future, { now: issuedAt })).resolves.toMatchObject({ code: 'invalid_timestamps' })

    const overlong = await createProofBundle(request({ expiresAt: '2026-09-01T07:00:00.000Z' }))
    await expect(verifyProofBundle(overlong, { now: issuedAt })).resolves.toMatchObject({ code: 'invalid_timestamps' })
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

  it('rejects duplicate disclosures instead of treating them as minimum disclosure', async () => {
    const bundle = clone(await createProofBundle(request()))
    bundle.disclosures.push(structuredClone(bundle.disclosures[0]))

    await expect(verifyProofBundle(bundle, { now: issuedAt })).resolves.toMatchObject({
      accepted: false,
      code: 'over_disclosure',
    })
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

  it('exports a v2 envelope that identifies—but never supplies—the trusted issuer key', async () => {
    const bundle = await createProofBundle(request(), '2026-09-01T06:02:00.000Z')

    expect(bundle).toMatchObject({
      version: 2,
      issuerId: 'openbridge-university-demo-registry',
      issuerKeyId: 'openbridge-p256-2026-01',
      consent: {
        grantedAt: '2026-09-01T06:02:00.000Z',
        maxUses: 1,
        claimIds: scholarshipRequirements.map((item) => item.id),
      },
    })
    expect(bundle).not.toHaveProperty('issuerPublicJwk')
  })

  it('rejects a widened or temporally impossible consent grant', async () => {
    const widened = clone(await createProofBundle(request(), '2026-09-01T06:02:00.000Z'))
    Object.assign(widened.consent, { maxUses: 2 })
    await expect(verifyProofBundle(widened, { now: issuedAt })).resolves.toMatchObject({ code: 'invalid_consent' })

    const late = clone(await createProofBundle(request(), '2026-09-01T06:02:00.000Z'))
    late.consent.grantedAt = '2026-09-01T06:11:00.000Z'
    await expect(verifyProofBundle(late, { now: issuedAt })).resolves.toMatchObject({ code: 'invalid_consent' })

    const future = await createProofBundle(request(), '2026-09-01T06:09:00.000Z')
    await expect(verifyProofBundle(future, { now: '2026-09-01T06:05:00.000Z' })).resolves.toMatchObject({ code: 'invalid_consent' })
  })

  it('rejects a credential re-signed by an untrusted replacement issuer key', async () => {
    const bundle = clone(await createProofBundle(request()))
    const attacker = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify'],
    )
    const attackerPublicJwk = await crypto.subtle.exportKey('jwk', attacker.publicKey)
    const attackerSignature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      attacker.privateKey,
      new TextEncoder().encode(JSON.stringify(bundle.credential)),
    )
    bundle.issuerSignature = toBase64Url(new Uint8Array(attackerSignature))
    Object.assign(bundle, { issuerPublicJwk: attackerPublicJwk })

    await expect(verifyProofBundle(bundle, { now: issuedAt })).resolves.toMatchObject({
      accepted: false,
      code: 'invalid_issuer_signature',
    })
  })

  it('refuses duplicate or non-consent-safe claim requests', async () => {
    await expect(createProofBundle(request({ claimIds: ['age_over_18', 'age_over_18'] }))).rejects.toThrow('Duplicate')
    await expect(createProofBundle(request({ claimIds: ['subject_ref' as never] }))).rejects.toThrow('outside')
  })

  it('fails closed with a structured result for malformed proof components', async () => {
    const malformed = clone(await createProofBundle(request()))
    Object.assign(malformed, { disclosures: null, holderSignature: '*' })

    await expect(verifyProofBundle(malformed, { now: issuedAt })).resolves.toMatchObject({
      accepted: false,
      code: 'invalid_envelope',
      disclosedClaimIds: [],
    })
  })
})
