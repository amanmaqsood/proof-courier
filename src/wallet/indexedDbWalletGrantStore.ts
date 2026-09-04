import { claimWalletExport, createWalletState, type WalletState } from '../proofState'
import {
  InvalidWalletGrantTransitionError,
  WalletGrantStoreClosedError,
  WalletGrantVersionConflictError,
  assertNextWalletState,
  cloneWalletState,
  type WalletGrantRefreshListener,
  type WalletGrantStore,
} from './walletGrantStore'

const DATABASE_VERSION = 1
const OBJECT_STORE_NAME = 'wallet-grant-state'
const ACTIVE_GRANT_KEY = 'active'

type RefreshMessage = {
  type: 'wallet-grant-refresh'
  version: number
}

export type IndexedDbWalletGrantStoreOptions = {
  databaseName?: string
  channelName?: string
  indexedDbFactory?: IDBFactory
  createBroadcastChannel?: (name: string) => BroadcastChannel | null
}

export class WalletGrantPersistenceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'WalletGrantPersistenceError'
  }
}

/**
 * Browser-persistent wallet grant adapter.
 *
 * IndexedDB readwrite transactions are the only coordination authority.
 * BroadcastChannel carries a version-only refresh hint after a commit; it is
 * never used to elect a winner or transport wallet state.
 */
export class IndexedDbWalletGrantStore implements WalletGrantStore {
  private readonly databaseName: string
  private readonly indexedDbFactory: IDBFactory
  private readonly channel: BroadcastChannel | null
  private readonly listeners = new Set<WalletGrantRefreshListener>()
  private databasePromise?: Promise<IDBDatabase>
  private database?: IDBDatabase
  private closed = false

  constructor(options: IndexedDbWalletGrantStoreOptions = {}) {
    this.databaseName = options.databaseName ?? 'proof-courier-wallet-grants'
    const indexedDbFactory = options.indexedDbFactory ?? globalThis.indexedDB
    if (!indexedDbFactory) {
      throw new WalletGrantPersistenceError('IndexedDB is unavailable in this browser.')
    }
    this.indexedDbFactory = indexedDbFactory

    const createChannel = options.createBroadcastChannel
      ?? (typeof BroadcastChannel === 'undefined'
        ? () => null
        : (name: string) => new BroadcastChannel(name))
    this.channel = createChannel(options.channelName ?? `${this.databaseName}:refresh`)
    this.channel?.addEventListener('message', this.handleRefreshMessage)
  }

  async read(): Promise<WalletState> {
    const database = await this.openDatabase()
    this.assertOpen()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(OBJECT_STORE_NAME, 'readonly')
      const request = transaction.objectStore(OBJECT_STORE_NAME).get(ACTIVE_GRANT_KEY)
      let state: WalletState | undefined
      let failure: unknown

      request.onsuccess = () => {
        try {
          state = decodeWalletState(request.result)
        } catch (error) {
          failure = error
          transaction.abort()
        }
      }
      request.onerror = () => {
        failure = request.error
      }
      transaction.oncomplete = () => {
        if (failure) reject(asPersistenceError('Could not read the wallet grant.', failure))
        else resolve(cloneWalletState(state ?? createWalletState()))
      }
      transaction.onabort = () => reject(asPersistenceError('Could not read the wallet grant.', failure ?? transaction.error))
      transaction.onerror = () => {
        failure ??= transaction.error
      }
    })
  }

  compareAndSet(expectedVersion: number, next: WalletState): Promise<WalletState> {
    const proposed = cloneWalletState(next)
    assertProposedVersion(expectedVersion, proposed)
    return this.atomicUpdate(expectedVersion, () => proposed)
  }

  claimExport(expectedVersion: number): Promise<WalletState> {
    return this.atomicUpdate(expectedVersion, (current) => claimWalletExport(current))
  }

  subscribe(listener: WalletGrantRefreshListener) {
    this.assertOpen()
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  close() {
    if (this.closed) return
    this.closed = true
    this.listeners.clear()
    this.channel?.removeEventListener('message', this.handleRefreshMessage)
    this.channel?.close()
    this.database?.close()
  }

  private async atomicUpdate(
    expectedVersion: number,
    transition: (current: WalletState) => WalletState,
  ): Promise<WalletState> {
    const database = await this.openDatabase()
    this.assertOpen()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(OBJECT_STORE_NAME, 'readwrite')
      const objectStore = transaction.objectStore(OBJECT_STORE_NAME)
      const request = objectStore.get(ACTIVE_GRANT_KEY)
      let committed: WalletState | undefined
      let failure: unknown

      request.onsuccess = () => {
        try {
          const current = decodeWalletState(request.result)
          if (current.version !== expectedVersion) {
            throw new WalletGrantVersionConflictError(expectedVersion, current.version)
          }
          const next = cloneWalletState(transition(cloneWalletState(current)))
          assertNextWalletState(current, next)
          objectStore.put(next, ACTIVE_GRANT_KEY)
          committed = next
        } catch (error) {
          failure = error
          transaction.abort()
        }
      }
      request.onerror = () => {
        failure = request.error
      }
      transaction.oncomplete = () => {
        if (!committed) {
          reject(asPersistenceError('The wallet grant transaction completed without a state update.', failure))
          return
        }
        const snapshot = cloneWalletState(committed)
        this.notifyAfterCommit(snapshot.version)
        resolve(snapshot)
      }
      transaction.onabort = () => {
        if (failure instanceof WalletGrantVersionConflictError
          || failure instanceof InvalidWalletGrantTransitionError) {
          reject(failure)
          return
        }
        reject(asPersistenceError('Could not update the wallet grant.', failure ?? transaction.error))
      }
      transaction.onerror = () => {
        failure ??= transaction.error
      }
    })
  }

  private openDatabase() {
    this.assertOpen()
    if (!this.databasePromise) {
      this.databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
        const request = this.indexedDbFactory.open(this.databaseName, DATABASE_VERSION)
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(OBJECT_STORE_NAME)) {
            request.result.createObjectStore(OBJECT_STORE_NAME)
          }
        }
        request.onsuccess = () => {
          if (this.closed) {
            request.result.close()
            reject(new WalletGrantStoreClosedError())
            return
          }
          this.database = request.result
          this.database.onversionchange = () => this.database?.close()
          resolve(request.result)
        }
        request.onerror = () => reject(asPersistenceError('Could not open the wallet grant database.', request.error))
        request.onblocked = () => reject(new WalletGrantPersistenceError('Opening the wallet grant database was blocked.'))
      })
    }
    return this.databasePromise
  }

  private readonly handleRefreshMessage = (event: MessageEvent<unknown>) => {
    if (!isRefreshMessage(event.data)) return
    this.notifyListeners(event.data.version)
  }

  private notifyAfterCommit(version: number) {
    this.notifyListeners(version)
    this.channel?.postMessage({ type: 'wallet-grant-refresh', version } satisfies RefreshMessage)
  }

  private notifyListeners(version: number) {
    for (const listener of this.listeners) {
      try {
        listener(version)
      } catch {
        // Refresh listeners are advisory and cannot affect the committed state.
      }
    }
  }

  private assertOpen() {
    if (this.closed) throw new WalletGrantStoreClosedError()
  }
}

function decodeWalletState(value: unknown): WalletState {
  if (value === undefined) return createWalletState()
  if (!value || typeof value !== 'object') {
    throw new WalletGrantPersistenceError('The stored wallet grant is malformed.')
  }
  const version = Reflect.get(value, 'version')
  if (!Number.isSafeInteger(version) || Number(version) < 1) {
    throw new WalletGrantPersistenceError('The stored wallet grant has an invalid version.')
  }
  return cloneWalletState(value as WalletState)
}

function assertProposedVersion(expectedVersion: number, next: WalletState) {
  if (!Number.isSafeInteger(expectedVersion) || next.version !== expectedVersion + 1) {
    throw new InvalidWalletGrantTransitionError(
      `A wallet grant transition must advance exactly one version from ${expectedVersion}.`,
    )
  }
}

function isRefreshMessage(value: unknown): value is RefreshMessage {
  return !!value
    && typeof value === 'object'
    && Reflect.get(value, 'type') === 'wallet-grant-refresh'
    && Number.isSafeInteger(Reflect.get(value, 'version'))
}

function asPersistenceError(message: string, cause: unknown) {
  return cause instanceof WalletGrantPersistenceError
    ? cause
    : new WalletGrantPersistenceError(message, { cause })
}
