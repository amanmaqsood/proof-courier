import { afterEach, describe, expect, it } from 'vitest'
import { SCHOLARSHIP_AUDIENCE, SCHOLARSHIP_PURPOSE, scholarshipRequirements } from './domain/proofCourier'
import {
  consentToWalletDraft,
  createVerifierState,
  createWalletState,
  submitVerifiedApplication,
  type VerifierState,
  type WalletState,
} from './proofState'
import { registerVerifierTools } from './verifierWebmcp'
import { registerWalletTools } from './walletWebmcp'

type RegisteredTool = {
  name: string
  execute: (input: Record<string, unknown>) => unknown | Promise<unknown>
}

function installRegistry() {
  const tools = new Map<string, RegisteredTool>()
  Object.defineProperty(document, 'modelContext', {
    configurable: true,
    value: {
      registerTool(tool: RegisteredTool, options?: { signal?: AbortSignal }) {
        tools.set(tool.name, tool)
        options?.signal?.addEventListener('abort', () => tools.delete(tool.name), { once: true })
      },
    },
  })
  return tools
}

afterEach(() => {
  delete document.modelContext
})

describe('Proof Courier WebMCP collaboration', () => {
  it('keeps export absent until human consent and withdraws it after one use', async () => {
    const tools = installRegistry()
    let wallet: WalletState = createWalletState()
    const manager = registerWalletTools({
      getState: () => wallet,
      setState: (next) => { wallet = next },
      focusConsent: () => undefined,
    })

    expect([...tools.keys()]).toEqual(['wallet_get_summary', 'wallet_prepare_disclosure', 'wallet_get_disclosure_state'])
    expect(tools.has('wallet_export_proof')).toBe(false)
    const summary = await tools.get('wallet_get_summary')!.execute({})
    expect(JSON.stringify(summary)).not.toContain('Maya Rahman')
    expect(JSON.stringify(summary)).not.toContain('openbridge-2026-7F3A')

    await tools.get('wallet_prepare_disclosure')!.execute({
      audience: SCHOLARSHIP_AUDIENCE,
      purpose: SCHOLARSHIP_PURPOSE,
      claimIds: scholarshipRequirements.map((item) => item.id),
      nonce: 'proof-request-001',
      expectedVersion: 1,
    })
    manager.sync()
    expect(wallet).toMatchObject({ version: 2, draft: { status: 'prepared' } })
    expect(tools.has('wallet_export_proof')).toBe(false)

    wallet = consentToWalletDraft(wallet)
    manager.sync()
    expect(tools.has('wallet_export_proof')).toBe(true)

    const exported = await tools.get('wallet_export_proof')!.execute({ expectedVersion: 3 }) as {
      data: { proofBundle: string; privateFieldsDisclosed: unknown[] }
    }
    manager.sync()

    expect(exported.data.proofBundle.length).toBeGreaterThan(100)
    expect(exported.data.privateFieldsDisclosed).toEqual([])
    expect(JSON.stringify(exported)).not.toContain('Maya Rahman')
    expect(JSON.stringify(exported)).not.toContain('openbridge-2026-7F3A')
    expect(wallet).toMatchObject({ version: 4, draft: { status: 'exported' } })
    expect(tools.has('wallet_export_proof')).toBe(false)
    expect(tools.has('wallet_get_disclosure_receipt')).toBe(true)
    manager.dispose()
    expect(tools.size).toBe(0)
  })

  it('carries the consented proof to a separate verifier without an agent submission tool', async () => {
    const walletTools = installRegistry()
    let wallet: WalletState = createWalletState()
    const walletManager = registerWalletTools({
      getState: () => wallet,
      setState: (next) => { wallet = next },
      focusConsent: () => undefined,
    })
    await walletTools.get('wallet_prepare_disclosure')!.execute({
      audience: SCHOLARSHIP_AUDIENCE,
      purpose: SCHOLARSHIP_PURPOSE,
      claimIds: scholarshipRequirements.map((item) => item.id),
      nonce: 'proof-request-002',
      expectedVersion: 1,
    })
    wallet = consentToWalletDraft(wallet)
    walletManager.sync()
    const exported = await walletTools.get('wallet_export_proof')!.execute({ expectedVersion: 3 }) as { data: { proofBundle: string } }
    walletManager.dispose()

    const verifierTools = installRegistry()
    let verifier: VerifierState = createVerifierState()
    const verifierManager = registerVerifierTools({
      getState: () => verifier,
      setState: (next) => { verifier = next },
      focusResult: () => undefined,
    })
    const verified = await verifierTools.get('fellowship_verify_proof')!.execute({ proofBundle: exported.data.proofBundle }) as {
      data: { privateFieldsReceived: unknown[]; status: string }
    }
    verifierManager.sync()

    expect(verified.data).toMatchObject({ status: 'verified', privateFieldsReceived: [] })
    expect([...verifierTools.keys()].some((name) => /submit|consent|approve/u.test(name))).toBe(false)
    expect(verifierTools.has('fellowship_get_verification_receipt')).toBe(true)

    verifier = submitVerifiedApplication(verifier)
    expect(verifier.status).toBe('submitted')
    verifierManager.dispose()
  })

  it('blocks stale wallet writes before a disclosure can be prepared', async () => {
    const tools = installRegistry()
    let wallet = createWalletState()
    registerWalletTools({
      getState: () => wallet,
      setState: (next) => { wallet = next },
      focusConsent: () => undefined,
    })

    await expect(tools.get('wallet_prepare_disclosure')!.execute({
      audience: SCHOLARSHIP_AUDIENCE,
      purpose: SCHOLARSHIP_PURPOSE,
      claimIds: scholarshipRequirements.map((item) => item.id),
      nonce: 'proof-request-stale',
      expectedVersion: 0,
    })).rejects.toThrow('Wallet changed')
    expect(wallet.version).toBe(1)
  })
})
