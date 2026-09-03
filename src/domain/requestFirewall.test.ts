import { describe, expect, it } from 'vitest'
import { scholarshipRequirements, SCHOLARSHIP_AUDIENCE, SCHOLARSHIP_PURPOSE } from './proofCourier'
import { evaluateDisclosureRequest } from './requestFirewall'

const minimumClaims = scholarshipRequirements.map((item) => item.id)

function request(overrides: Record<string, unknown> = {}) {
  return {
    audience: SCHOLARSHIP_AUDIENCE,
    purpose: SCHOLARSHIP_PURPOSE,
    claimIds: minimumClaims,
    nonce: 'firewall-request-001',
    ttlSeconds: 600,
    requestedPrivateFields: [],
    requestsAutomaticSubmission: false,
    ...overrides,
  }
}

describe('Request Firewall', () => {
  it('allows the published minimum request without changing it', () => {
    expect(evaluateDisclosureRequest(request())).toMatchObject({
      decision: 'allowed',
      reasonCodes: [],
      proposedRequest: { claimIds: minimumClaims, ttlSeconds: 600 },
      dataLeavesWallet: false,
    })
  })

  it('counterproposes derived claims when a verifier asks for raw records', () => {
    expect(evaluateDisclosureRequest(request({
      requestedPrivateFields: ['date_of_birth', 'exact_gpa', 'home_address'],
    }))).toMatchObject({
      decision: 'counterproposal',
      reasonCodes: ['RAW_PRIVATE_FIELDS', 'NOT_MINIMUM_DISCLOSURE'],
      proposedRequest: {
        claimIds: minimumClaims,
        requestedPrivateFields: [],
      },
      dataLeavesWallet: false,
    })
  })

  it('blocks wrong-purpose and automatic-submission requests', () => {
    expect(evaluateDisclosureRequest(request({
      purpose: 'Use the proof for credit scoring.',
      requestsAutomaticSubmission: true,
    }))).toMatchObject({
      decision: 'blocked',
      reasonCodes: ['WRONG_PURPOSE', 'AUTOMATIC_SUBMISSION'],
      proposedRequest: null,
      dataLeavesWallet: false,
    })
  })

  it('counterproposes a ten-minute lifetime when a request lasts too long', () => {
    expect(evaluateDisclosureRequest(request({ ttlSeconds: 86_400 }))).toMatchObject({
      decision: 'counterproposal',
      reasonCodes: ['EXCESSIVE_LIFETIME'],
      proposedRequest: { ttlSeconds: 600 },
    })
  })
})
