import type { IssuedProofChallenge } from '../domain/proofCourier'

export type StoredChallenge = {
  challenge: IssuedProofChallenge
  status: 'active' | 'expired' | 'consumed'
  consumedAt?: string
}

export type ChallengeConsumption = {
  nonce: string
  audience: string
  purpose: string
  requiredClaimIds: readonly string[]
  now: string
}

export type ChallengeConsumptionResult =
  | { status: 'consumed'; challenge: IssuedProofChallenge }
  | { status: 'missing' | 'binding_mismatch' | 'not_active' | 'expired' | 'replayed' }

/**
 * Verifier-owned seam for issuing and atomically consuming proof challenges.
 * A successful consume is final, including when later cryptographic checks
 * reject the proof.
 */
export interface ChallengeStore {
  issue(challenge: IssuedProofChallenge): Promise<StoredChallenge>
  read(nonce: string): Promise<StoredChallenge | null>
  consume(input: ChallengeConsumption): Promise<ChallengeConsumptionResult>
  close(): void
}

export class ChallengeAlreadyIssuedError extends Error {
  readonly nonce: string

  constructor(nonce: string) {
    super('A challenge with this nonce has already been issued.')
    this.name = 'ChallengeAlreadyIssuedError'
    this.nonce = nonce
  }
}

export class InvalidChallengeRecordError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidChallengeRecordError'
  }
}

export class ChallengeStoreClosedError extends Error {
  constructor() {
    super('The challenge store is closed.')
    this.name = 'ChallengeStoreClosedError'
  }
}

export class InMemoryChallengeStore implements ChallengeStore {
  private readonly records = new Map<string, StoredChallenge>()
  private tail: Promise<void> = Promise.resolve()
  private closed = false

  constructor(initialChallenges: readonly IssuedProofChallenge[] = []) {
    for (const challenge of initialChallenges) {
      assertIssuableChallenge(challenge)
      if (this.records.has(challenge.nonce)) throw new ChallengeAlreadyIssuedError(challenge.nonce)
      this.records.set(challenge.nonce, { challenge: cloneChallenge(challenge), status: 'active' })
    }
  }

  issue(challenge: IssuedProofChallenge): Promise<StoredChallenge> {
    return this.enqueue(() => {
      assertIssuableChallenge(challenge)
      if (this.records.has(challenge.nonce)) throw new ChallengeAlreadyIssuedError(challenge.nonce)
      const record: StoredChallenge = { challenge: cloneChallenge(challenge), status: 'active' }
      this.records.set(challenge.nonce, record)
      return cloneRecord(record)
    })
  }

  read(nonce: string): Promise<StoredChallenge | null> {
    return this.enqueue(() => {
      const record = this.records.get(nonce)
      return record ? cloneRecord(record) : null
    })
  }

  consume(input: ChallengeConsumption): Promise<ChallengeConsumptionResult> {
    return this.enqueue(() => {
      const record = this.records.get(input.nonce)
      if (!record) return { status: 'missing' }
      if (record.status === 'consumed') return { status: 'replayed' }
      if (record.status === 'expired') return { status: 'expired' }

      const now = Date.parse(input.now)
      const issuedAt = Date.parse(record.challenge.issuedAt)
      const expiresAt = Date.parse(record.challenge.expiresAt)
      if (!Number.isFinite(now) || now < issuedAt) return { status: 'not_active' }
      if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || now >= expiresAt) {
        record.status = 'expired'
        return { status: 'expired' }
      }
      if (!sameChallengeBinding(record.challenge, input)) return { status: 'binding_mismatch' }

      record.status = 'consumed'
      record.consumedAt = input.now
      return { status: 'consumed', challenge: cloneChallenge(record.challenge) }
    })
  }

  close() {
    this.closed = true
    this.records.clear()
  }

  private enqueue<T>(operation: () => T | Promise<T>): Promise<T> {
    if (this.closed) return Promise.reject(new ChallengeStoreClosedError())
    const result = this.tail.then(operation, operation)
    this.tail = result.then(() => undefined, () => undefined)
    return result
  }
}

function assertIssuableChallenge(challenge: IssuedProofChallenge) {
  const issuedAt = Date.parse(challenge.issuedAt)
  const expiresAt = Date.parse(challenge.expiresAt)
  if (
    typeof challenge.nonce !== 'string'
    || challenge.nonce.trim() !== challenge.nonce
    || challenge.nonce.length < 8
    || challenge.nonce.length > 80
    || !Number.isFinite(issuedAt)
    || !Number.isFinite(expiresAt)
    || expiresAt <= issuedAt
    || new Set(challenge.requiredClaimIds).size !== challenge.requiredClaimIds.length
  ) {
    throw new InvalidChallengeRecordError('The verifier challenge record is malformed.')
  }
}

function sameChallengeBinding(challenge: IssuedProofChallenge, input: ChallengeConsumption) {
  return challenge.audience === input.audience
    && challenge.purpose === input.purpose
    && sameStringSet(challenge.requiredClaimIds, input.requiredClaimIds)
}

function sameStringSet(left: readonly string[], right: readonly string[]) {
  return left.length === right.length
    && new Set(left).size === left.length
    && new Set(right).size === right.length
    && left.every((value) => right.includes(value))
}

function cloneChallenge(challenge: IssuedProofChallenge): IssuedProofChallenge {
  return structuredClone(challenge)
}

function cloneRecord(record: StoredChallenge): StoredChallenge {
  return structuredClone(record)
}
