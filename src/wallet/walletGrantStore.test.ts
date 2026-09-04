import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  SCHOLARSHIP_AUDIENCE,
  SCHOLARSHIP_PURPOSE,
  scholarshipRequirements,
  type ProofRequest,
} from '../domain/proofCourier'
import type { WalletState } from '../proofState'
import {
  InMemoryWalletGrantStore,
  WalletGrantVersionConflictError,
} from './walletGrantStore'

const issuedAt = '2026-09-04T10:00:00.000Z'
const expiresAt = '2099-09-04T10:10:00.000Z'

function request(): ProofRequest {
  return {
    audience: SCHOLARSHIP_AUDIENCE,
    purpose: SCHOLARSHIP_PURPOSE,
    claimIds: scholarshipRequirements.map((requirement) => requirement.id),
    nonce: 'request-store-test-0001',
    issuedAt,
    expiresAt,
  }
}

function consentedState(): WalletState {
  return {
    version: 4,
    draft: {
      request: request(),
      status: 'consented',
      preparedAt: issuedAt,
      consentedAt: '2026-09-04T10:01:00.000Z',
    },
  }
}

describe('InMemoryWalletGrantStore', () => {
  afterEach(() => vi.restoreAllMocks())

  it('updates only the expected version and returns isolated snapshots', async () => {
    const store = new InMemoryWalletGrantStore()
    const prepared: WalletState = {
      version: 2,
      draft: {
        request: request(),
        status: 'prepared',
        preparedAt: issuedAt,
      },
    }

    const updated = await store.compareAndSet(1, prepared)
    updated.version = 99

    await expect(store.compareAndSet(1, prepared)).rejects.toMatchObject({
      name: 'WalletGrantVersionConflictError',
      expectedVersion: 1,
      actualVersion: 2,
    })
    await expect(store.read()).resolves.toMatchObject({
      version: 2,
      draft: { status: 'prepared' },
    })
  })

  it('allows exactly one of ten competing callers to claim an export grant', async () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001')
    const store = new InMemoryWalletGrantStore(consentedState())

    const outcomes = await Promise.allSettled(
      Array.from({ length: 10 }, () => store.claimExport(4)),
    )

    const fulfilled = outcomes.filter((outcome) => outcome.status === 'fulfilled')
    const rejected = outcomes.filter((outcome) => outcome.status === 'rejected')
    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(9)
    expect(rejected.every(
      (outcome) => outcome.status === 'rejected'
        && outcome.reason instanceof WalletGrantVersionConflictError,
    )).toBe(true)
    await expect(store.read()).resolves.toMatchObject({
      version: 5,
      draft: {
        status: 'exporting',
        exportOperationId: '00000000-0000-4000-8000-000000000001',
      },
    })
  })
})
