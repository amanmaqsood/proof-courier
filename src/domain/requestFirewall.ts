import {
  SCHOLARSHIP_AUDIENCE,
  SCHOLARSHIP_PURPOSE,
  scholarshipRequirements,
  type PublicClaimId,
} from './proofPolicy'

export type DisclosureRequestCandidate = {
  audience: string
  purpose: string
  claimIds: string[]
  nonce: string
  ttlSeconds: number
  requestedPrivateFields?: string[]
  requestsAutomaticSubmission?: boolean
}

export type FirewallReasonCode =
  | 'WRONG_AUDIENCE'
  | 'WRONG_PURPOSE'
  | 'AUTOMATIC_SUBMISSION'
  | 'INVALID_NONCE'
  | 'RAW_PRIVATE_FIELDS'
  | 'NOT_MINIMUM_DISCLOSURE'
  | 'EXCESSIVE_LIFETIME'

export type SafeDisclosureRequest = {
  audience: typeof SCHOLARSHIP_AUDIENCE
  purpose: typeof SCHOLARSHIP_PURPOSE
  claimIds: PublicClaimId[]
  nonce: string
  ttlSeconds: 600
  requestedPrivateFields: []
  requestsAutomaticSubmission: false
}

export type FirewallDecision = {
  decision: 'allowed' | 'counterproposal' | 'blocked'
  reasonCodes: FirewallReasonCode[]
  summary: string
  proposedRequest: SafeDisclosureRequest | null
  dataLeavesWallet: false
  humanConsentStillRequired: true
}

const requiredClaimIds = scholarshipRequirements.map((item) => item.id)

export function evaluateDisclosureRequest(candidate: DisclosureRequestCandidate): FirewallDecision {
  const blockingReasons: FirewallReasonCode[] = []
  const negotiableReasons: FirewallReasonCode[] = []
  const privateFields = candidate.requestedPrivateFields ?? []

  if (candidate.audience !== SCHOLARSHIP_AUDIENCE) blockingReasons.push('WRONG_AUDIENCE')
  if (candidate.purpose !== SCHOLARSHIP_PURPOSE) blockingReasons.push('WRONG_PURPOSE')
  if (candidate.requestsAutomaticSubmission === true) blockingReasons.push('AUTOMATIC_SUBMISSION')
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,79}$/u.test(candidate.nonce)) blockingReasons.push('INVALID_NONCE')

  if (privateFields.length > 0) negotiableReasons.push('RAW_PRIVATE_FIELDS')
  if (!sameClaimSet(candidate.claimIds, requiredClaimIds) || privateFields.length > 0) {
    negotiableReasons.push('NOT_MINIMUM_DISCLOSURE')
  }
  if (!Number.isFinite(candidate.ttlSeconds) || candidate.ttlSeconds <= 0 || candidate.ttlSeconds > 600) {
    negotiableReasons.push('EXCESSIVE_LIFETIME')
  }

  const reasonCodes = [...blockingReasons, ...negotiableReasons]
  if (blockingReasons.length > 0) {
    return {
      decision: 'blocked',
      reasonCodes,
      summary: 'Request blocked before consent because its verifier boundary is unsafe.',
      proposedRequest: null,
      dataLeavesWallet: false,
      humanConsentStillRequired: true,
    }
  }

  const proposedRequest: SafeDisclosureRequest = {
    audience: SCHOLARSHIP_AUDIENCE,
    purpose: SCHOLARSHIP_PURPOSE,
    claimIds: [...requiredClaimIds],
    nonce: candidate.nonce,
    ttlSeconds: 600,
    requestedPrivateFields: [],
    requestsAutomaticSubmission: false,
  }

  if (negotiableReasons.length > 0) {
    return {
      decision: 'counterproposal',
      reasonCodes,
      summary: 'No data released. The wallet proposes the five derived eligibility claims with a ten-minute lifetime.',
      proposedRequest,
      dataLeavesWallet: false,
      humanConsentStillRequired: true,
    }
  }

  return {
    decision: 'allowed',
    reasonCodes: [],
    summary: 'Request matches the published minimum disclosure boundary. Human consent is still required before export.',
    proposedRequest,
    dataLeavesWallet: false,
    humanConsentStillRequired: true,
  }
}

function sameClaimSet(candidate: string[], required: readonly string[]) {
  return candidate.length === required.length
    && new Set(candidate).size === candidate.length
    && required.every((claimId) => candidate.includes(claimId))
}
