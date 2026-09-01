export type ClaimId =
  | 'age_over_18'
  | 'active_enrollment'
  | 'study_field'
  | 'gpa_band'
  | 'holder_public_key'
  | 'residency_eligible'
  | 'credential_type'
  | 'subject_ref'

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

export type PublicClaimId = Exclude<ClaimId, 'holder_public_key' | 'credential_type' | 'subject_ref'>

export type ProofBundle = {
  version: 1
  audience: string
  purpose: string
  nonce: string
  issuedAt: string
  expiresAt: string
  credential: CredentialMetadata
  issuerPublicJwk: JsonWebKey
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

export const SCHOLARSHIP_AUDIENCE = 'openbridge-scholarship-2026'
export const SCHOLARSHIP_PURPOSE = 'Verify minimum eligibility for the Open Web Fellowship.'

export const scholarshipRequirements: Array<{
  id: PublicClaimId
  label: string
  expectedValue: boolean | string
  privateAlternative: string
}> = [
  { id: 'age_over_18', label: 'Applicant is at least 18', expectedValue: true, privateAlternative: 'Exact date of birth' },
  { id: 'active_enrollment', label: 'Currently enrolled', expectedValue: true, privateAlternative: 'Full enrollment record' },
  { id: 'study_field', label: 'Studies an eligible field', expectedValue: 'computer_science', privateAlternative: 'Complete transcript' },
  { id: 'gpa_band', label: 'GPA is 3.5 or above', expectedValue: '3.5_or_above', privateAlternative: 'Exact GPA and grades' },
  { id: 'residency_eligible', label: 'Meets residency rule', expectedValue: true, privateAlternative: 'Home address' },
]

const issuerPublicJwk: JsonWebKey = {
  kty: 'EC',
  x: 'g5HTb6pGvp61iOTeladCwm8dJeHHUeQ-erw4WiPsQn8',
  y: 'cYeYkcfmlQ10E9--fHdiTELyQS7vNa2KJq4MqdrngaM',
  crv: 'P-256',
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

export async function createProofBundle(request: ProofRequest): Promise<ProofBundle> {
  const uniqueClaimIds = [...new Set(request.claimIds)]
  if (uniqueClaimIds.length !== request.claimIds.length) throw new Error('Duplicate claim IDs are not allowed.')
  for (const claimId of uniqueClaimIds) {
    if (!allowedPublicClaims.has(claimId)) throw new Error(`Claim ${claimId} is outside the consent-safe disclosure set.`)
  }
  const requestedProofs = uniqueClaimIds.map((claimId) => proofFixtures.find((proof) => proof.claim.id === claimId)!)
  const holderKeyProof = proofFixtures.find((proof) => proof.claim.id === 'holder_public_key')!
  const unsigned = {
    version: 1 as const,
    audience: request.audience,
    purpose: request.purpose,
    nonce: request.nonce,
    issuedAt: request.issuedAt,
    expiresAt: request.expiresAt,
    credential,
    issuerPublicJwk,
    issuerSignature,
    disclosures: [...requestedProofs, holderKeyProof],
  }
  const holderKey = await crypto.subtle.importKey('jwk', holderPrivateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, holderKey, encode(signablePresentation(unsigned)))
  return { ...unsigned, holderSignature: toBase64Url(new Uint8Array(signature)) }
}

export async function verifyProofBundle(
  bundle: ProofBundle,
  options: { now: string; usedNonces?: ReadonlySet<string> } = { now: new Date().toISOString() },
): Promise<VerificationResult> {
  const claimIds = bundle.disclosures.map((proof) => proof.claim.id)
  const fail = (code: VerificationResult['code'], summary: string): VerificationResult => ({
    accepted: false,
    code,
    summary,
    disclosedClaimIds: claimIds,
  })

  if (bundle.audience !== SCHOLARSHIP_AUDIENCE) return fail('wrong_audience', 'Proof is bound to a different verifier.')
  if (bundle.purpose !== SCHOLARSHIP_PURPOSE) return fail('wrong_purpose', 'Proof is bound to a different purpose.')
  if (Date.parse(options.now) > Date.parse(bundle.expiresAt)) return fail('expired', 'Proof bundle has expired. Ask the person for fresh consent.')
  if (options.usedNonces?.has(bundle.nonce)) return fail('replayed', 'This one-time proof nonce has already been used.')

  const allowed = new Set<ClaimId>([...scholarshipRequirements.map((item) => item.id), 'holder_public_key'])
  if (claimIds.some((id) => !allowed.has(id))) return fail('over_disclosure', 'Proof contains a claim the verifier did not request.')

  for (const requirement of scholarshipRequirements) {
    const proof = bundle.disclosures.find((item) => item.claim.id === requirement.id)
    if (!proof) return fail('missing_claim', `Missing required claim: ${requirement.id}.`)
    if (proof.claim.value !== requirement.expectedValue) return fail('claim_mismatch', `Claim ${requirement.id} does not satisfy the published rule.`)
  }

  const issuerKey = await crypto.subtle.importKey('jwk', bundle.issuerPublicJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
  const issuerValid = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    issuerKey,
    fromBase64Url(bundle.issuerSignature),
    encode(JSON.stringify(bundle.credential)),
  )
  if (!issuerValid) return fail('invalid_issuer_signature', 'Credential issuer signature is invalid.')

  for (const proof of bundle.disclosures) {
    if (await rootFromProof(proof) !== bundle.credential.rootHash) {
      return fail('invalid_merkle_proof', `Claim ${proof.claim.id} is not committed by the issuer.`)
    }
  }

  const holderKeyProof = bundle.disclosures.find((proof) => proof.claim.id === 'holder_public_key')
  if (!holderKeyProof || typeof holderKeyProof.claim.value !== 'string') {
    return fail('missing_claim', 'Holder binding key is missing.')
  }
  const holderKey = await crypto.subtle.importKey(
    'jwk',
    JSON.parse(holderKeyProof.claim.value) as JsonWebKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify'],
  )
  const unsigned: Omit<ProofBundle, 'holderSignature'> = {
    version: bundle.version,
    audience: bundle.audience,
    purpose: bundle.purpose,
    nonce: bundle.nonce,
    issuedAt: bundle.issuedAt,
    expiresAt: bundle.expiresAt,
    credential: bundle.credential,
    issuerPublicJwk: bundle.issuerPublicJwk,
    issuerSignature: bundle.issuerSignature,
    disclosures: bundle.disclosures,
  }
  const holderValid = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    holderKey,
    fromBase64Url(bundle.holderSignature),
    encode(signablePresentation(unsigned)),
  )
  if (!holderValid) return fail('invalid_holder_signature', 'Presentation binding was changed after human consent.')

  return {
    accepted: true,
    code: 'verified',
    summary: 'Five minimum eligibility claims verified. No private source record was disclosed.',
    disclosedClaimIds: claimIds,
  }
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

function signablePresentation(bundle: Omit<ProofBundle, 'holderSignature'>) {
  return JSON.stringify({
    version: bundle.version,
    audience: bundle.audience,
    purpose: bundle.purpose,
    nonce: bundle.nonce,
    issuedAt: bundle.issuedAt,
    expiresAt: bundle.expiresAt,
    disclosures: bundle.disclosures,
  })
}

async function rootFromProof(proof: DisclosureProof) {
  let current = await sha256(JSON.stringify([proof.claim.id, proof.claim.value, proof.claim.salt]))
  for (const sibling of proof.siblings) {
    current = sibling.position === 'left'
      ? await sha256(sibling.hash + current)
      : await sha256(current + sibling.hash)
  }
  return current
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
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
