import { expect, test, type BrowserContext, type Page } from '@playwright/test'

const adapterModulePath = '/src/wallet/indexedDbWalletGrantStore.ts'

function databaseName(testName: string) {
  return `proof-courier-${testName}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function openWalletTabs(context: BrowserContext, firstPage: Page) {
  const secondPage = await context.newPage()
  await Promise.all([firstPage.goto('/wallet'), secondPage.goto('/wallet')])
  return secondPage
}

async function deleteDatabase(page: Page, name: string) {
  await page.evaluate(async (database) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(database)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
      request.onblocked = () => reject(new Error('IndexedDB deletion was blocked by an open connection.'))
    })
  }, name)
}

test('wallet grant survives a real page reload', async ({ page }) => {
  const name = databaseName('reload')
  await page.goto('/wallet')
  await deleteDatabase(page, name)

  await page.evaluate(async ({ database, modulePath }) => {
    const { IndexedDbWalletGrantStore } = await import(modulePath)
    const store = new IndexedDbWalletGrantStore({ databaseName: database })
    await store.compareAndSet(1, {
      version: 2,
      draft: {
        request: {
          audience: 'openbridge-fellowship.example',
          purpose: 'Confirm minimum eligibility for the synthetic Openbridge fellowship application',
          claimIds: ['age_over_18', 'active_enrollment', 'study_field', 'gpa_band', 'residency_eligible'],
          nonce: 'request-indexeddb-reload',
          issuedAt: '2026-09-04T10:00:00.000Z',
          expiresAt: '2099-09-04T10:10:00.000Z',
        },
        status: 'prepared',
        preparedAt: '2026-09-04T10:00:00.000Z',
      },
    })
    store.close()
  }, { database: name, modulePath: adapterModulePath })

  await page.reload()

  const restored = await page.evaluate(async ({ database, modulePath }) => {
    const { IndexedDbWalletGrantStore } = await import(modulePath)
    const store = new IndexedDbWalletGrantStore({ databaseName: database })
    const state = await store.read()
    store.close()
    return state
  }, { database: name, modulePath: adapterModulePath })

  expect(restored).toMatchObject({
    version: 2,
    draft: {
      status: 'prepared',
      request: { nonce: 'request-indexeddb-reload' },
    },
  })
  await deleteDatabase(page, name)
})

test('IndexedDB allows one export claim across ten callers in two tabs', async ({ context, page }) => {
  const name = databaseName('race')
  const secondPage = await openWalletTabs(context, page)
  await deleteDatabase(page, name)

  await page.evaluate(async ({ database, modulePath }) => {
    const { IndexedDbWalletGrantStore } = await import(modulePath)
    const store = new IndexedDbWalletGrantStore({ databaseName: database })
    await store.compareAndSet(1, {
      version: 2,
      draft: {
        request: {
          audience: 'openbridge-fellowship.example',
          purpose: 'Confirm minimum eligibility for the synthetic Openbridge fellowship application',
          claimIds: ['age_over_18', 'active_enrollment', 'study_field', 'gpa_band', 'residency_eligible'],
          nonce: 'request-indexeddb-race',
          issuedAt: '2026-09-04T10:00:00.000Z',
          expiresAt: '2099-09-04T10:10:00.000Z',
        },
        status: 'consented',
        preparedAt: '2026-09-04T10:00:00.000Z',
        consentedAt: '2026-09-04T10:01:00.000Z',
      },
    })
    store.close()
  }, { database: name, modulePath: adapterModulePath })

  const raceFive = async (target: Page) => target.evaluate(async ({ database, modulePath }) => {
    const { IndexedDbWalletGrantStore } = await import(modulePath)
    const stores = Array.from(
      { length: 5 },
      () => new IndexedDbWalletGrantStore({ databaseName: database }),
    )
    const outcomes = await Promise.all(stores.map(async (store: {
      claimExport: (version: number) => Promise<{ version: number }>
      close: () => void
    }) => {
      try {
        const state = await store.claimExport(2)
        return { status: 'claimed', version: state.version }
      } catch (error) {
        return {
          status: 'rejected',
          name: error instanceof Error ? error.name : 'UnknownError',
        }
      } finally {
        store.close()
      }
    }))
    return outcomes
  }, { database: name, modulePath: adapterModulePath })

  const outcomes = (await Promise.all([raceFive(page), raceFive(secondPage)])).flat()
  expect(outcomes.filter((outcome) => outcome.status === 'claimed')).toHaveLength(1)
  expect(outcomes.filter((outcome) => outcome.name === 'WalletGrantVersionConflictError')).toHaveLength(9)

  const finalState = await page.evaluate(async ({ database, modulePath }) => {
    const { IndexedDbWalletGrantStore } = await import(modulePath)
    const store = new IndexedDbWalletGrantStore({ databaseName: database })
    const state = await store.read()
    store.close()
    return state
  }, { database: name, modulePath: adapterModulePath })
  expect(finalState).toMatchObject({ version: 3, draft: { status: 'exporting' } })
  expect(finalState.draft?.exportOperationId).toMatch(/^[0-9a-f-]{36}$/u)

  await secondPage.close()
  await deleteDatabase(page, name)
})

test('BroadcastChannel tells another tab to refresh without carrying wallet state', async ({ context, page }) => {
  const name = databaseName('notification')
  const secondPage = await openWalletTabs(context, page)
  await deleteDatabase(page, name)

  await secondPage.evaluate(async ({ database, modulePath }) => {
    const { IndexedDbWalletGrantStore } = await import(modulePath)
    const store = new IndexedDbWalletGrantStore({ databaseName: database })
    const target = window as typeof window & {
      walletGrantNotice?: Promise<{
        notifiedVersion: number
        refreshedVersion: number
        rawMessage: unknown
      }>
      walletGrantStore?: { close: () => void }
    }
    target.walletGrantStore = store
    const refreshed = new Promise<{ notifiedVersion: number; refreshedVersion: number }>((resolve) => {
      store.subscribe(async (version: number) => {
        resolve({ notifiedVersion: version, refreshedVersion: (await store.read()).version })
      })
    })
    const rawMessage = new Promise<unknown>((resolve) => {
      const observer = new BroadcastChannel(`${database}:refresh`)
      observer.addEventListener('message', (event) => {
        observer.close()
        resolve(event.data)
      }, { once: true })
    })
    target.walletGrantNotice = Promise.all([refreshed, rawMessage]).then(([state, message]) => ({
      ...state,
      rawMessage: message,
    }))
  }, { database: name, modulePath: adapterModulePath })

  const notice = secondPage.evaluate(async () => {
    const target = window as typeof window & {
      walletGrantNotice?: Promise<{
        notifiedVersion: number
        refreshedVersion: number
        rawMessage: unknown
      }>
    }
    return target.walletGrantNotice
  })

  await page.evaluate(async ({ database, modulePath }) => {
    const { IndexedDbWalletGrantStore } = await import(modulePath)
    const store = new IndexedDbWalletGrantStore({ databaseName: database })
    await store.compareAndSet(1, { version: 2 })
    store.close()
  }, { database: name, modulePath: adapterModulePath })

  await expect(notice).resolves.toEqual({
    notifiedVersion: 2,
    refreshedVersion: 2,
    rawMessage: { type: 'wallet-grant-refresh', version: 2 },
  })
  await secondPage.evaluate(() => {
    const target = window as typeof window & { walletGrantStore?: { close: () => void } }
    target.walletGrantStore?.close()
  })
  await secondPage.close()
  await deleteDatabase(page, name)
})
