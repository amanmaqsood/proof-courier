import type { DisclosureProof, ProofBundle, VerificationResult } from './proofCourier'

export const SCHOLARSHIP_AUDIENCE = 'openbridge-scholarship-2026'
export const SCHOLARSHIP_PURPOSE = 'Verify minimum eligibility for the Open Web Fellowship.'

export const scholarshipRequirements = [
  { id: 'age_over_18', label: 'Applicant is at least 18', expectedValue: true, privateAlternative: 'Exact date of birth' },
  { id: 'active_enrollment', label: 'Currently enrolled', expectedValue: true, privateAlternative: 'Full enrollment record' },
  { id: 'study_field', label: 'Studies an eligible field', expectedValue: 'computer_science', privateAlternative: 'Complete transcript' },
  { id: 'gpa_band', label: 'GPA is 3.5 or above', expectedValue: '3.5_or_above', privateAlternative: 'Exact GPA and grades' },
  { id: 'residency_eligible', label: 'Meets residency rule', expectedValue: true, privateAlternative: 'Home address' },
] as const

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

  const allowed = new Set([...scholarshipRequirements.map((item) => item.id), 'holder_public_key'])
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
    credentialId: undefined,
    disclosures: bundle.disclosures,
  }, (_key, value) => value === undefined ? undefined : value)
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

function fromBase64Url(value: string) {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4)
  const binary = atob(base64)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}
