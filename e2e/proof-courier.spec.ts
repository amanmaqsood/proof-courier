import { expect, test, type Page } from '@playwright/test'

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

test('human consent unlocks one cross-tab proof and keeps final submission human', async ({ context }) => {
  const fellowship = await context.newPage()
  const wallet = await context.newPage()
  await installWebMcpHarness(fellowship)
  await installWebMcpHarness(wallet)

  await fellowship.goto('/fellowship')
  await wallet.goto('/wallet')

  await expect(fellowship.getByRole('heading', { name: 'Prove eligibility without sending the file.' })).toBeVisible()
  await expect(wallet.getByRole('heading', { name: 'Your credential wallet' })).toBeVisible()
  await expect.poll(() => toolNames(fellowship)).toEqual([
    'fellowship_get_requirements', 'fellowship_verify_proof', 'fellowship_get_verification_state',
  ])
  await expect.poll(() => toolNames(wallet)).toEqual([
    'wallet_get_summary', 'wallet_prepare_disclosure', 'wallet_get_disclosure_state',
  ])

  const request = await callTool(fellowship, 'fellowship_get_requirements', {}) as {
    data: { audience: string; purpose: string; nonce: string; requiredClaims: Array<{ id: string }> }
  }
  await callTool(wallet, 'wallet_get_summary', {})
  await callTool(wallet, 'wallet_prepare_disclosure', {
    audience: request.data.audience,
    purpose: request.data.purpose,
    claimIds: request.data.requiredClaims.map((item) => item.id),
    nonce: request.data.nonce,
    expectedVersion: 1,
  })

  await expect(wallet.getByRole('heading', { name: 'Review five derived claims' })).toBeVisible()
  await expect(wallet.getByText('ABSENT UNTIL CONSENT', { exact: true })).toBeVisible()
  expect(await toolNames(wallet)).not.toContain('wallet_export_proof')
  await wallet.getByRole('button', { name: 'Approve this disclosure' }).click()
  await expect(wallet.getByText('One-time export unlocked', { exact: true })).toBeVisible()
  await expect(wallet.getByText('LIVE FOR ONE CALL', { exact: true })).toBeVisible()
  await expect.poll(() => toolNames(wallet)).toContain('wallet_export_proof')

  const exported = await callTool(wallet, 'wallet_export_proof', { expectedVersion: 3 }) as {
    data: { proofBundle: string; privateFieldsDisclosed: unknown[] }
  }
  expect(exported.data.privateFieldsDisclosed).toEqual([])
  await expect(wallet.getByText('Minimum proof exported once', { exact: true })).toBeVisible()
  await expect(wallet.getByText('WITHDRAWN AFTER USE', { exact: true })).toBeVisible()
  await expect.poll(() => toolNames(wallet)).not.toContain('wallet_export_proof')
  await expect.poll(() => toolNames(wallet)).toContain('wallet_get_disclosure_receipt')

  const verified = await callTool(fellowship, 'fellowship_verify_proof', { proofBundle: exported.data.proofBundle }) as {
    data: { status: string; privateFieldsReceived: unknown[] }
  }
  expect(verified.data).toMatchObject({ status: 'verified', privateFieldsReceived: [] })
  await expect(fellowship.getByRole('heading', { name: 'Minimum proof verified' })).toBeVisible()
  await expect(fellowship.getByText('Not received:', { exact: true })).toBeVisible()
  expect((await toolNames(fellowship)).some((name) => /submit|consent|approve/u.test(name))).toBe(false)

  await fellowship.getByRole('button', { name: 'Submit verified application' }).click()
  await expect(fellowship.getByRole('heading', { name: 'Human submission complete' })).toBeVisible()
  await expect(fellowship.getByText('Application submitted by the person', { exact: true })).toBeVisible()
})

test('the landing, wallet, verifier, and evidence room remain usable at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await installWebMcpHarness(page)

  for (const path of ['/', '/wallet', '/fellowship', '/evidence']) {
    await page.goto(path)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  }

  await expect(page.getByRole('heading', { name: /Trust should be visible/u })).toBeVisible()
})

test('the public evidence room exposes the complete judge proof without a product claim gap', async ({ page }) => {
  await page.goto('/evidence')

  await expect(page.getByRole('heading', { name: /Trust should be visible/u })).toBeVisible()
  await expect(page.getByText('15/15', { exact: true })).toBeVisible()
  await expect(page.getByText('4/4', { exact: true })).toBeVisible()
  await expect(page.getByText('0 → 1 → 0', { exact: true })).toBeVisible()
  await expect(page.getByText('A capability that lives for exactly one call.', { exact: true })).toBeVisible()
  await expect(page.getByText('Agent submission capability: absent', { exact: true })).toBeVisible()
  await expect(page.getByText('What this evidence does not claim', { exact: true })).toBeVisible()
})

test('rejected proof remains visible and recoverable without a submission action', async ({ page }) => {
  await installWebMcpHarness(page)
  await page.goto('/fellowship')

  await expect(callTool(page, 'fellowship_verify_proof', { proofBundle: 'not-a-proof-bundle' })).rejects.toThrow()
  await expect(page.getByText('Proof bundle is not valid encoded JSON.', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Submit application/u })).toHaveCount(0)
})
