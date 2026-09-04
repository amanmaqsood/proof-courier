import { expect, test, type Page } from '@playwright/test'

const walletUrl = 'http://127.0.0.1:4274/wallet'
const showcaseUrl = 'http://127.0.0.1:4275/evidence'

type BrowserTool = {
  name: string
  execute: (input: Record<string, unknown>) => unknown | Promise<unknown>
}

type HarnessWindow = Window & typeof globalThis & {
  __proofCourierTools: Map<string, BrowserTool>
}

async function installWebMcpHarness(page: Page) {
  await page.addInitScript(() => {
    const tools = new Map<string, BrowserTool>()
    Object.defineProperty(window, '__proofCourierTools', { value: tools })
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: {
        registerTool(tool: BrowserTool, options?: { signal?: AbortSignal }) {
          tools.set(tool.name, tool)
          options?.signal?.addEventListener('abort', () => tools.delete(tool.name), { once: true })
        },
      },
    })
  })
}

async function callTool(page: Page, name: string, input: Record<string, unknown>) {
  return page.evaluate(async ({ toolName, toolInput }) => {
    const tool = (window as HarnessWindow).__proofCourierTools.get(toolName)
    if (!tool) throw new Error(`Tool ${toolName} is not registered.`)
    return tool.execute(toolInput)
  }, { toolName: name, toolInput: input })
}

async function toolNames(page: Page) {
  return page.evaluate(() => [...(window as HarnessWindow).__proofCourierTools.keys()])
}

function expectSecurityHeaders(headers: Record<string, string>) {
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
  expect(headers['cross-origin-opener-policy']).toBe('same-origin')
  expect(headers['permissions-policy']).toContain('camera=()')
  expect(headers['referrer-policy']).toBe('no-referrer')
  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['x-frame-options']).toBe('DENY')
}

test('isolated role artifacts complete the human-gated proof courier journey', async ({ context, request }) => {
  const fellowship = await context.newPage()
  const wallet = await context.newPage()
  const showcase = await context.newPage()
  await Promise.all([fellowship, wallet, showcase].map(installWebMcpHarness))

  const fellowshipResponse = await fellowship.goto('/fellowship')
  const walletResponse = await wallet.goto(walletUrl)
  const showcaseResponse = await showcase.goto(showcaseUrl)
  expect(fellowshipResponse).not.toBeNull()
  expect(walletResponse).not.toBeNull()
  expect(showcaseResponse).not.toBeNull()
  expectSecurityHeaders(fellowshipResponse!.headers())
  expectSecurityHeaders(walletResponse!.headers())
  expectSecurityHeaders(showcaseResponse!.headers())

  expect(new URL(fellowship.url()).origin).not.toBe(new URL(wallet.url()).origin)
  expect(new URL(showcase.url()).origin).not.toBe(new URL(wallet.url()).origin)
  expect((await request.get('http://127.0.0.1:4273/wallet')).status()).toBe(404)
  expect((await request.get('http://127.0.0.1:4274/fellowship')).status()).toBe(404)
  expect((await request.get('http://127.0.0.1:4275/wallet')).status()).toBe(404)

  await expect(fellowship.getByRole('heading', { name: 'Prove eligibility without sending the file.' })).toBeVisible()
  await expect(wallet.getByRole('heading', { name: 'Your credential wallet' })).toBeVisible()
  await expect(showcase.getByRole('heading', { name: /Trust should be visible/u })).toBeVisible()
  await expect.poll(() => toolNames(fellowship)).toEqual([
    'fellowship_get_requirements', 'fellowship_evaluate_counterproposal', 'fellowship_verify_proof', 'fellowship_get_verification_state',
  ])
  await expect.poll(() => toolNames(wallet)).toEqual([
    'wallet_get_summary', 'wallet_evaluate_request', 'wallet_prepare_disclosure', 'wallet_get_disclosure_state',
  ])
  expect(await toolNames(showcase)).toEqual([])

  const requestResult = await callTool(fellowship, 'fellowship_get_requirements', {}) as {
    data: { audience: string; purpose: string; nonce: string; expiresAt: string; requiredClaims: Array<{ id: string }> }
  }
  const firewall = await callTool(wallet, 'wallet_evaluate_request', {
    audience: requestResult.data.audience,
    purpose: requestResult.data.purpose,
    claimIds: requestResult.data.requiredClaims.map((item) => item.id),
    nonce: requestResult.data.nonce,
    ttlSeconds: 86_400,
    requestedPrivateFields: ['date_of_birth', 'exact_gpa', 'home_address'],
    requestsAutomaticSubmission: false,
  }) as { data: { decision: string; dataLeavesWallet: boolean; proposedRequest: Record<string, unknown> } }
  expect(firewall.data).toMatchObject({ decision: 'counterproposal', dataLeavesWallet: false })

  const negotiated = await callTool(fellowship, 'fellowship_evaluate_counterproposal', firewall.data.proposedRequest) as {
    data: { compatible: boolean }
  }
  expect(negotiated.data.compatible).toBe(true)
  await callTool(wallet, 'wallet_prepare_disclosure', {
    audience: requestResult.data.audience,
    purpose: requestResult.data.purpose,
    claimIds: requestResult.data.requiredClaims.map((item) => item.id),
    nonce: requestResult.data.nonce,
    challengeExpiresAt: requestResult.data.expiresAt,
    expectedVersion: 1,
  })

  await expect(wallet.getByText('ABSENT UNTIL CONSENT', { exact: true })).toBeVisible()
  expect(await toolNames(wallet)).not.toContain('wallet_export_proof')
  await wallet.getByRole('button', { name: 'Approve this disclosure' }).click()
  await expect.poll(() => toolNames(wallet)).toContain('wallet_export_proof')

  const exported = await callTool(wallet, 'wallet_export_proof', { expectedVersion: 3 }) as {
    data: { proofBundle: string; privateFieldsDisclosed: unknown[] }
  }
  expect(exported.data.privateFieldsDisclosed).toEqual([])
  await expect.poll(() => toolNames(wallet)).not.toContain('wallet_export_proof')

  const verified = await callTool(fellowship, 'fellowship_verify_proof', { proofBundle: exported.data.proofBundle }) as {
    data: { status: string; privateFieldsReceived: unknown[] }
  }
  expect(verified.data).toMatchObject({ status: 'verified', privateFieldsReceived: [] })
  await expect(fellowship.getByRole('heading', { name: 'Minimum proof verified' })).toBeVisible()
  expect((await toolNames(fellowship)).some((name) => /submit|consent|approve/u.test(name))).toBe(false)

  const fellowshipResources = await fellowship.evaluate(() => performance.getEntriesByType('resource').map((entry) => entry.name))
  const walletResources = await wallet.evaluate(() => performance.getEntriesByType('resource').map((entry) => entry.name))
  expect(fellowshipResources.some((url) => url.startsWith(new URL(walletUrl).origin))).toBe(false)
  expect(walletResources.some((url) => url.startsWith(new URL(fellowship.url()).origin))).toBe(false)
})
