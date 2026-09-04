import {
  SCHOLARSHIP_AUDIENCE,
  SCHOLARSHIP_PURPOSE,
  TRUSTED_ISSUER_ID,
  TRUSTED_ISSUER_KEY_ID,
  scholarshipRequirements,
  type ClaimId,
  type PublicClaimId,
} from './proofPolicy'
import { serializeSignedPresentation } from './proofEnvelope'

export {
  SCHOLARSHIP_AUDIENCE,
  SCHOLARSHIP_PURPOSE,
  TRUSTED_ISSUER_ID,
  TRUSTED_ISSUER_KEY_ID,
  scholarshipRequirements,
}
export type { ClaimId, PublicClaimId }

export type DisclosureClaim = {
  id: ClaimId
  value: boolean | string
  salt: string
}

export type MerkleSibling = {
  position: 'left' | 'right'
  hash: string
}

export type DisclosureProof = {
  claim: DisclosureClaim
  index: number
  siblings: MerkleSibling[]
}

export type CredentialMetadata = {
  issuer: string
  issuedAt: string
  validUntil: string
  rootHash: string
}

export type ProofRequest = {
  audience: typeof SCHOLARSHIP_AUDIENCE
  purpose: typeof SCHOLARSHIP_PURPOSE
  claimIds: PublicClaimId[]
  nonce: string
  issuedAt: string
  expiresAt: string
}

export type IssuedProofChallenge = {
  audience: typeof SCHOLARSHIP_AUDIENCE
  purpose: typeof SCHOLARSHIP_PURPOSE
  nonce: string
  requiredClaimIds: PublicClaimId[]
  issuedAt: string
  expiresAt: string
}

export type ProofBundle = {
  version: 2
  issuerId: typeof TRUSTED_ISSUER_ID
  issuerKeyId: typeof TRUSTED_ISSUER_KEY_ID
  audience: string
  purpose: string
  nonce: string
  issuedAt: string
  expiresAt: string
  consent: {
    grantedAt: string
    maxUses: 1
    claimIds: PublicClaimId[]
  }
  credential: CredentialMetadata
  issuerSignature: string
  disclosures: DisclosureProof[]
  holderSignature: string
}

export type VerificationResult = {
  accepted: boolean
  code:
    | 'verified'
    | 'wrong_audience'
    | 'wrong_purpose'
    | 'expired'
    | 'invalid_timestamps'
    | 'invalid_consent'
    | 'invalid_envelope'
    | 'invalid_challenge'
    | 'unissued_nonce'
    | 'replayed'
    | 'over_disclosure'
    | 'missing_claim'
    | 'claim_mismatch'
    | 'invalid_issuer_signature'
    | 'invalid_merkle_proof'
    | 'invalid_holder_signature'
  summary: string
  disclosedClaimIds: ClaimId[]
}

const holderPrivateJwk: JsonWebKey = {
  kty: 'EC',
  x: '73MCBEUii6y5PYxxmF339P6JWpGHBCefVx9O5ePW-C0',
  y: 'DOxBcR5SK-j2PzNSYLsnMyTgE8-lzVmWq9d4_ELvBaw',
  crv: 'P-256',
  d: 'FiDbtU9snUn25RtpoOGNq0EANEiIkegPbThCSZVmsnM',
}

const credential: CredentialMetadata = {
  issuer: 'Openbridge University Demo Registry',
  issuedAt: '2026-08-15T00:00:00.000Z',
  validUntil: '2027-08-15T00:00:00.000Z',
  rootHash: 'e86c85a3355e2a482df2c8789f8e05fac7573673c36435f617988695d3f89d5c',
}

const issuerSignature = 'SijVkV-7OqriyIshzelJIkwJF-z8OtFPGjh17n-t7krviKTqRC1MISHXfo8AsrHTBcKMbWY5F6apYW62bRFmXw'

const proofFixtures: DisclosureProof[] = [
  { claim: { id: 'age_over_18', value: true, salt: 'raven-41' }, index: 0, siblings: [
    { position: 'right', hash: 'c627453128743378bed03ea052fe4a4bc2923906600bc7391bd5a00e670af63c' },
    { position: 'right', hash: '48804c78adb615d924664d3f5060369e5a0c63875b3bd7d59f524d322b687e5c' },
    { position: 'right', hash: '873280d3af31a687057fa19100149a105fc800b7524bd53dbb03480cd45e42c1' },
  ] },
  { claim: { id: 'active_enrollment', value: true, salt: 'maple-22' }, index: 1, siblings: [
    { position: 'left', hash: '182b00d7a6c059f70732752b9fbff6d8a9243bacaccb1838dabae6d18d336e72' },
    { position: 'right', hash: '48804c78adb615d924664d3f5060369e5a0c63875b3bd7d59f524d322b687e5c' },
    { position: 'right', hash: '873280d3af31a687057fa19100149a105fc800b7524bd53dbb03480cd45e42c1' },
  ] },
  { claim: { id: 'study_field', value: 'computer_science', salt: 'ember-73' }, index: 2, siblings: [
    { position: 'right', hash: '86ed04a843a5f1e67de6a6868d5b6e09438a26f55b2037e6212e136e1c458335' },
    { position: 'left', hash: '7be4a9dcfa4e5355897cf09d09cf6b795acc33e042e8c261de3204e7e4e25b3a' },
    { position: 'right', hash: '873280d3af31a687057fa19100149a105fc800b7524bd53dbb03480cd45e42c1' },
  ] },
  { claim: { id: 'gpa_band', value: '3.5_or_above', salt: 'cedar-19' }, index: 3, siblings: [
    { position: 'left', hash: 'f12bf37d60f42e09d36d440aec6142822d962c09f15de27a021a06c2bdee7433' },
    { position: 'left', hash: '7be4a9dcfa4e5355897cf09d09cf6b795acc33e042e8c261de3204e7e4e25b3a' },
    { position: 'right', hash: '873280d3af31a687057fa19100149a105fc800b7524bd53dbb03480cd45e42c1' },
  ] },
  { claim: { id: 'holder_public_key', value: '{"kty":"EC","x":"73MCBEUii6y5PYxxmF339P6JWpGHBCefVx9O5ePW-C0","y":"DOxBcR5SK-j2PzNSYLsnMyTgE8-lzVmWq9d4_ELvBaw","crv":"P-256"}', salt: 'orbit-58' }, index: 4, siblings: [
    { position: 'right', hash: '612c5ddb2f27207c5c17ba90408d3fc554bd4b5e193be2f4e544dc4a20c79439' },
    { position: 'right', hash: 'c7f3cbcd28f4823f6e491828f90a1aa224946a820d4de4d9d8d4d2db39d2abdb' },
    { position: 'left', hash: 'a310694763d9f47ffd0354347da24ba8214af8b538d881365c53a829f8e3e10a' },
  ] },
  { claim: { id: 'residency_eligible', value: true, salt: 'lumen-64' }, index: 5, siblings: [
    { position: 'left', hash: '894ab072471df1241b03d0d6b7360e87cd17cc4ea6ce406d09527ec538c21242' },
    { position: 'right', hash: 'c7f3cbcd28f4823f6e491828f90a1aa224946a820d4de4d9d8d4d2db39d2abdb' },
    { position: 'left', hash: 'a310694763d9f47ffd0354347da24ba8214af8b538d881365c53a829f8e3e10a' },
  ] },
  { claim: { id: 'credential_type', value: 'student_eligibility', salt: 'birch-37' }, index: 6, siblings: [
    { position: 'right', hash: '0eff1d4dc272845337ce71ac5491482019bd79937e8ef53510fe3cd10bd5b382' },
    { position: 'left', hash: '7b90a45a9988c19e946fd47934f7c9ade63d398691d89dd07b94d14942c6c9bc' },
    { position: 'left', hash: 'a310694763d9f47ffd0354347da24ba8214af8b538d881365c53a829f8e3e10a' },
  ] },
  { claim: { id: 'subject_ref', value: 'student-7F3A', salt: 'nova-86' }, index: 7, siblings: [
    { position: 'left', hash: 'd85b90952420fc413e44e0a8d194d3c2d84aeeff6cbd9e69f8638b807911240c' },
    { position: 'left', hash: '7b90a45a9988c19e946fd47934f7c9ade63d398691d89dd07b94d14942c6c9bc' },
    { position: 'left', hash: 'a310694763d9f47ffd0354347da24ba8214af8b538d881365c53a829f8e3e10a' },
  ] },
]

const allowedPublicClaims = new Set<ClaimId>(scholarshipRequirements.map((requirement) => requirement.id))

export function getWalletSummary() {
  return {
    issuer: credential.issuer,
    validUntil: credential.validUntil,
    privateFields: ['Exact date of birth', 'Student ID', 'Exact GPA', 'Full transcript', 'Home address'],
    availableDerivedClaims: scholarshipRequirements.map(({ id, label }) => ({ id, label })),
    warning: 'Private source values stay in this wallet. Export requires a visible human consent action.',
  }
}

export function getScholarshipRequest(nonce = 'request-OWF-2026-001') {
  return {
    audience: SCHOLARSHIP_AUDIENCE,
    purpose: SCHOLARSHIP_PURPOSE,
    nonce,
    requiredClaims: scholarshipRequirements,
    prohibitedClaims: ['date_of_birth', 'student_id', 'exact_gpa', 'full_transcript', 'home_address'],
    finalBoundary: 'Only the person can submit the application.',
  }
}

export async function createProofBundle(
  request: ProofRequest,
  consentGrantedAt = request.issuedAt,
): Promise<ProofBundle> {
  const uniqueClaimIds = [...new Set(request.claimIds)]
  if (uniqueClaimIds.length !== request.claimIds.length) throw new Error('Duplicate claim IDs are not allowed.')
  for (const claimId of uniqueClaimIds) {
    if (!allowedPublicClaims.has(claimId)) throw new Error(`Claim ${claimId} is outside the consent-safe disclosure set.`)
  }
  const requestedProofs = uniqueClaimIds.map((claimId) => proofFixtures.find((proof) => proof.claim.id === claimId)!)
  const holderKeyProof = proofFixtures.find((proof) => proof.claim.id === 'holder_public_key')!
  const unsigned: Omit<ProofBundle, 'holderSignature'> = {
    version: 2 as const,
    issuerId: TRUSTED_ISSUER_ID,
    issuerKeyId: TRUSTED_ISSUER_KEY_ID,
    audience: request.audience,
    purpose: request.purpose,
    nonce: request.nonce,
    issuedAt: request.issuedAt,
    expiresAt: request.expiresAt,
    consent: {
      grantedAt: consentGrantedAt,
      maxUses: 1,
      claimIds: [...request.claimIds],
    },
    credential,
    issuerSignature,
    disclosures: [...requestedProofs, holderKeyProof],
  }
  const holderKey = await crypto.subtle.importKey('jwk', holderPrivateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, holderKey, encode(serializeSignedPresentation(unsigned)))
  return { ...unsigned, holderSignature: toBase64Url(new Uint8Array(signature)) }
}

export function encodeProofBundle(bundle: ProofBundle) {
  return toBase64Url(encode(JSON.stringify(bundle)))
}

export function decodeProofBundle(encoded: string): ProofBundle {
  try {
    return JSON.parse(new TextDecoder().decode(fromBase64Url(encoded))) as ProofBundle
  } catch {
    throw new Error('Proof bundle is not valid encoded JSON.')
  }
}

function encode(value: string) {
  return new TextEncoder().encode(value)
}

function toBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')
}

function fromBase64Url(value: string) {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4)
  const binary = atob(base64)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}
