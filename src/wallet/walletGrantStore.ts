import { claimWalletExport, createWalletState, type WalletState } from '../proofState'

export type WalletGrantRefreshListener = (version: number) => void

/**
 * Authority-owned state seam for a wallet disclosure grant.
 *
 * compareAndSet and claimExport are atomic for each adapter. Subscribers are
 * only refresh hints: callers must read the store again before making a
 * decision.
 */
export interface WalletGrantStore {
  read(): Promise<WalletState>
  compareAndSet(expectedVersion: number, next: WalletState): Promise<WalletState>
  claimExport(expectedVersion: number): Promise<WalletState>
  subscribe(listener: WalletGrantRefreshListener): () => void
  close(): void
}

export class WalletGrantVersionConflictError extends Error {
  readonly expectedVersion: number
  readonly actualVersion: number

  constructor(expectedVersion: number, actualVersion: number) {
    super(`Wallet grant version changed: expected ${expectedVersion}, found ${actualVersion}.`)
    this.name = 'WalletGrantVersionConflictError'
    this.expectedVersion = expectedVersion
    this.actualVersion = actualVersion
  }
}

export class InvalidWalletGrantTransitionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidWalletGrantTransitionError'
  }
}

export class WalletGrantStoreClosedError extends Error {
  constructor() {
    super('The wallet grant store is closed.')
    this.name = 'WalletGrantStoreClosedError'
  }
}

export class InMemoryWalletGrantStore implements WalletGrantStore {
  private state: WalletState
  private readonly listeners = new Set<WalletGrantRefreshListener>()
  private tail: Promise<void> = Promise.resolve()
  private closed = false

  constructor(initialState: WalletState = createWalletState()) {
    this.state = cloneWalletState(initialState)
  }

  read(): Promise<WalletState> {
    return this.enqueue(() => cloneWalletState(this.state))
  }

  compareAndSet(expectedVersion: number, next: WalletState): Promise<WalletState> {
    return this.enqueue(() => this.commit(expectedVersion, next))
  }

  claimExport(expectedVersion: number): Promise<WalletState> {
    return this.enqueue(() => {
      this.assertExpectedVersion(expectedVersion)
      return this.commit(expectedVersion, claimWalletExport(cloneWalletState(this.state)))
    })
  }

  subscribe(listener: WalletGrantRefreshListener) {
    if (this.closed) throw new WalletGrantStoreClosedError()
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  close() {
    this.closed = true
    this.listeners.clear()
  }

  private commit(expectedVersion: number, next: WalletState) {
    this.assertExpectedVersion(expectedVersion)
    assertNextWalletState(this.state, next)
    this.state = cloneWalletState(next)
    this.notify(this.state.version)
    return cloneWalletState(this.state)
  }

  private assertExpectedVersion(expectedVersion: number) {
    if (this.state.version !== expectedVersion) {
      throw new WalletGrantVersionConflictError(expectedVersion, this.state.version)
    }
  }

  private notify(version: number) {
    for (const listener of this.listeners) {
      try {
        listener(version)
      } catch {
        // A refresh listener cannot roll back an already committed grant.
      }
    }
  }

  private enqueue<T>(operation: () => T | Promise<T>): Promise<T> {
    if (this.closed) return Promise.reject(new WalletGrantStoreClosedError())
    const result = this.tail.then(operation, operation)
    this.tail = result.then(() => undefined, () => undefined)
    return result
  }
}

export function assertNextWalletState(current: WalletState, next: WalletState) {
  if (!Number.isSafeInteger(next.version) || next.version !== current.version + 1) {
    throw new InvalidWalletGrantTransitionError(
      `A wallet grant transition must advance exactly one version from ${current.version}.`,
    )
  }
}

export function cloneWalletState(state: WalletState): WalletState {
  return structuredClone(state)
}
