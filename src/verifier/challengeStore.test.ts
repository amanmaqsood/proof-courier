import { describe, expect, it } from 'vitest'
import {
  SCHOLARSHIP_AUDIENCE,
  SCHOLARSHIP_PURPOSE,
  issueScholarshipChallenge,
  scholarshipRequirements,
} from '../domain/proofVerifier'
import {
  ChallengeAlreadyIssuedError,
  InMemoryChallengeStore,
  type ChallengeConsumption,
} from './challengeStore'

const now = new Date('2026-09-04T10:00:00.000Z')

function consumption(nonce: string, at = '2026-09-04T10:01:00.000Z'): ChallengeConsumption {
  return {
    nonce,
    audience: SCHOLARSHIP_AUDIENCE,
    purpose: SCHOLARSHIP_PURPOSE,
    requiredClaimIds: scholarshipRequirements.map((requirement) => requirement.id),
    now: at,
  }
}

describe('InMemoryChallengeStore', () => {
  it('issues a challenge once and isolates returned records from mutation', async () => {
    const store = new InMemoryChallengeStore()
    const challenge = issueScholarshipChallenge({ now, nonce: 'request-issued-once' })

    const issued = await store.issue(challenge)
    issued.challenge.nonce = 'mutated-by-caller'

    await expect(store.issue(challenge)).rejects.toBeInstanceOf(ChallengeAlreadyIssuedError)
    await expect(store.read(challenge.nonce)).resolves.toMatchObject({
      status: 'active',
      challenge: { nonce: 'request-issued-once' },
    })
  })

  it('does not consume an expired or mismatched challenge', async () => {
    const store = new InMemoryChallengeStore()
    const mismatch = issueScholarshipChallenge({ now, nonce: 'request-binding-test' })
    const expired = issueScholarshipChallenge({ now, nonce: 'request-expired-test' })
    await store.issue(mismatch)
    await store.issue(expired)

    await expect(store.consume({
      ...consumption(mismatch.nonce),
      purpose: 'another-purpose',
    })).resolves.toEqual({ status: 'binding_mismatch' })
    await expect(store.consume(consumption(mismatch.nonce))).resolves.toMatchObject({
      status: 'consumed',
      challenge: { nonce: mismatch.nonce },
    })
    await expect(store.consume(consumption(expired.nonce, '2026-09-04T10:11:00.000Z'))).resolves.toEqual({
      status: 'expired',
    })
  })

  it('atomically consumes a challenge once across ten competing callers', async () => {
    const store = new InMemoryChallengeStore()
    const challenge = issueScholarshipChallenge({ now, nonce: 'request-ten-way-race' })
    await store.issue(challenge)

    const outcomes = await Promise.all(
      Array.from({ length: 10 }, () => store.consume(consumption(challenge.nonce))),
    )

    expect(outcomes.filter((outcome) => outcome.status === 'consumed')).toHaveLength(1)
    expect(outcomes.filter((outcome) => outcome.status === 'replayed')).toHaveLength(9)
    await expect(store.read(challenge.nonce)).resolves.toMatchObject({
      status: 'consumed',
      consumedAt: '2026-09-04T10:01:00.000Z',
    })
  })
})
