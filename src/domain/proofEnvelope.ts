import type { ProofBundle } from './proofCourier'

export function serializeSignedPresentation(bundle: Omit<ProofBundle, 'holderSignature'>) {
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
