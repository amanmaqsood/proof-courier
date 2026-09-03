import type {
  DisclosureProof,
  ProofBundle,
  VerificationResult,
} from './proofCourier'
import {
  SCHOLARSHIP_AUDIENCE,
  SCHOLARSHIP_PURPOSE,
  TRUSTED_ISSUER_ID,
  TRUSTED_ISSUER_KEY_ID,
  scholarshipRequirements,
} from './proofPolicy'

export { SCHOLARSHIP_AUDIENCE, SCHOLARSHIP_PURPOSE, scholarshipRequirements }

const trustedIssuerPublicJwk: JsonWebKey = {
  kty: 'EC',
  x: 'g5HTb6pGvp61iOTeladCwm8dJeHHUeQ-erw4WiPsQn8',
  y: 'cYeYkcfmlQ10E9--fHdiTELyQS7vNa2KJq4MqdrngaM',
  crv: 'P-256',
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

export async function verifyProofBundle(
  bundle: ProofBundle,
  options: { now: string; usedNonces?: ReadonlySet<string> } = { now: new Date().toISOString() },
): Promise<VerificationResult> {
  try {
    return await verifyProofBundleUnsafe(bundle, options)
  } catch {
    return {
      accepted: false,
      code: 'invalid_envelope',
      summary: 'Proof envelope is malformed and was rejected without changing verifier state.',
      disclosedClaimIds: [],
    }
  }
}

async function verifyProofBundleUnsafe(
  bundle: ProofBundle,
  options: { now: string; usedNonces?: ReadonlySet<string> },
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
  if (bundle.issuerId !== TRUSTED_ISSUER_ID || bundle.issuerKeyId !== TRUSTED_ISSUER_KEY_ID) {
    return fail('invalid_issuer_signature', 'Credential issuer is not in the verifier trust registry.')
  }
  const now = Date.parse(options.now)
  const issuedAt = Date.parse(bundle.issuedAt)
  const expiresAt = Date.parse(bundle.expiresAt)
  const consentGrantedAt = Date.parse(bundle.consent.grantedAt)
  const credentialIssuedAt = Date.parse(bundle.credential.issuedAt)
  const credentialValidUntil = Date.parse(bundle.credential.validUntil)
  const allTimes = [now, issuedAt, expiresAt, consentGrantedAt, credentialIssuedAt, credentialValidUntil]
  if (allTimes.some((value) => !Number.isFinite(value))) return fail('invalid_timestamps', 'Proof contains a malformed timestamp.')
  if (issuedAt > now || credentialIssuedAt > now) return fail('invalid_timestamps', 'Proof or credential is not valid yet.')
  if (expiresAt <= issuedAt || expiresAt - issuedAt > 10 * 60_000) return fail('invalid_timestamps', 'Proof lifetime must be greater than zero and no longer than ten minutes.')
  if (now > expiresAt || now > credentialValidUntil) return fail('expired', 'Proof or credential has expired. Ask the person for fresh consent.')
  if (options.usedNonces?.has(bundle.nonce)) return fail('replayed', 'This one-time proof nonce has already been used.')

  const allowed = new Set([...scholarshipRequirements.map((item) => item.id), 'holder_public_key'])
  if (claimIds.some((id) => !allowed.has(id))) return fail('over_disclosure', 'Proof contains a claim the verifier did not request.')
  if (new Set(claimIds).size !== claimIds.length) {
    return fail('over_disclosure', 'Proof must contain each minimum claim exactly once.')
  }

  for (const requirement of scholarshipRequirements) {
    const proof = bundle.disclosures.find((item) => item.claim.id === requirement.id)
    if (!proof) return fail('missing_claim', `Missing required claim: ${requirement.id}.`)
    if (proof.claim.value !== requirement.expectedValue) return fail('claim_mismatch', `Claim ${requirement.id} does not satisfy the published rule.`)
  }

  const disclosedPublicClaimIds = claimIds.filter((id) => id !== 'holder_public_key')
  const consentClaimIds = bundle.consent.claimIds
  const sameClaimSet = new Set(consentClaimIds).size === consentClaimIds.length
    && consentClaimIds.length === disclosedPublicClaimIds.length
    && consentClaimIds.every((id) => disclosedPublicClaimIds.includes(id))
  if (
    bundle.consent.maxUses !== 1
    || consentGrantedAt < issuedAt
    || consentGrantedAt > expiresAt
    || !sameClaimSet
  ) {
    return fail('invalid_consent', 'Proof is not bound to one valid human consent grant for the exact disclosed claims.')
  }

  const issuerKey = await crypto.subtle.importKey('jwk', trustedIssuerPublicJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
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
    issuerId: bundle.issuerId,
    issuerKeyId: bundle.issuerKeyId,
    audience: bundle.audience,
    purpose: bundle.purpose,
    nonce: bundle.nonce,
    issuedAt: bundle.issuedAt,
    expiresAt: bundle.expiresAt,
    consent: bundle.consent,
    credential: bundle.credential,
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
    issuerId: bundle.issuerId,
    issuerKeyId: bundle.issuerKeyId,
    audience: bundle.audience,
    purpose: bundle.purpose,
    nonce: bundle.nonce,
    issuedAt: bundle.issuedAt,
    expiresAt: bundle.expiresAt,
    consent: bundle.consent,
    credential: bundle.credential,
    issuerSignature: bundle.issuerSignature,
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

function fromBase64Url(value: string) {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4)
  const binary = atob(base64)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}
