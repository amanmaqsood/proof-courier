import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createProofBundle,
  encodeProofBundle,
  SCHOLARSHIP_AUDIENCE,
  SCHOLARSHIP_PURPOSE,
  scholarshipRequirements,
} from './domain/proofCourier'
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
import { InMemoryChallengeStore } from './verifier/challengeStore'

type RegisteredTool = {
  name: string
  annotations?: Record<string, boolean>
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

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => { resolve = done })
  return { promise, resolve }
}

function futureChallengeExpiry(offsetMs = 10 * 60_000) {
  return new Date(Date.now() + offsetMs).toISOString()
}

afterEach(() => {
  vi.useRealTimers()
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

    expect([...tools.keys()]).toEqual(['wallet_get_summary', 'wallet_evaluate_request', 'wallet_prepare_disclosure', 'wallet_get_disclosure_state'])
    expect(tools.get('wallet_prepare_disclosure')?.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
    })
    expect(tools.has('wallet_export_proof')).toBe(false)
    const summary = await tools.get('wallet_get_summary')!.execute({})
    expect(JSON.stringify(summary)).not.toContain('Maya Rahman')
    expect(JSON.stringify(summary)).not.toContain('openbridge-2026-7F3A')

    await tools.get('wallet_prepare_disclosure')!.execute({
      audience: SCHOLARSHIP_AUDIENCE,
      purpose: SCHOLARSHIP_PURPOSE,
      claimIds: scholarshipRequirements.map((item) => item.id),
      nonce: 'proof-request-001',
      challengeExpiresAt: futureChallengeExpiry(),
      expectedVersion: 1,
    })
    manager.sync()
    expect(wallet).toMatchObject({ version: 2, draft: { status: 'prepared' } })
    expect(tools.has('wallet_export_proof')).toBe(false)

    wallet = consentToWalletDraft(wallet)
    manager.sync()
    expect(tools.has('wallet_export_proof')).toBe(true)
    expect(tools.get('wallet_export_proof')?.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
    })

    const exported = await tools.get('wallet_export_proof')!.execute({ expectedVersion: 3 }) as {
      data: { proofBundle: string; privateFieldsDisclosed: unknown[] }
    }
    manager.sync()

    expect(exported.data.proofBundle.length).toBeGreaterThan(100)
    expect(exported.data.privateFieldsDisclosed).toEqual([])
    expect(JSON.stringify(exported)).not.toContain('Maya Rahman')
    expect(JSON.stringify(exported)).not.toContain('openbridge-2026-7F3A')
    expect(wallet).toMatchObject({ version: 5, draft: { status: 'exported' } })
    expect(tools.has('wallet_export_proof')).toBe(false)
    expect(tools.has('wallet_get_disclosure_receipt')).toBe(true)
    manager.dispose()
    expect(tools.size).toBe(0)
  })

  it('carries the consented proof to a separate verifier without an agent submission tool', async () => {
    const verifierTools = installRegistry()
    let verifier: VerifierState = createVerifierState()
    const verifierManager = registerVerifierTools({
      getState: () => verifier,
      setState: (next) => { verifier = next },
      focusResult: () => undefined,
    })
    expect(verifierTools.get('fellowship_get_requirements')?.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
    })
    const request = await verifierTools.get('fellowship_get_requirements')!.execute({}) as { data: { nonce: string; expiresAt: string } }

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
      nonce: request.data.nonce,
      challengeExpiresAt: request.data.expiresAt,
      expectedVersion: 1,
    })
    wallet = consentToWalletDraft(wallet)
    walletManager.sync()
    const exported = await walletTools.get('wallet_export_proof')!.execute({ expectedVersion: 3 }) as { data: { proofBundle: string } }
    walletManager.dispose()

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

  it('allows exactly one wallet export when two calls race for the same consent grant', async () => {
    const tools = installRegistry()
    let wallet: WalletState = createWalletState()
    const manager = registerWalletTools({
      getState: () => wallet,
      setState: (next) => { wallet = next },
      focusConsent: () => undefined,
    })
    await tools.get('wallet_prepare_disclosure')!.execute({
      audience: SCHOLARSHIP_AUDIENCE,
      purpose: SCHOLARSHIP_PURPOSE,
      claimIds: scholarshipRequirements.map((item) => item.id),
      nonce: 'concurrent-export-001',
      challengeExpiresAt: futureChallengeExpiry(),
      expectedVersion: 1,
    })
    wallet = consentToWalletDraft(wallet)
    manager.sync()
    const exportTool = tools.get('wallet_export_proof')!

    const outcomes = await Promise.allSettled([
      exportTool.execute({ expectedVersion: 3 }),
      exportTool.execute({ expectedVersion: 3 }),
    ])

    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1)
    expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1)
    expect(wallet).toMatchObject({ version: 5, draft: { status: 'exported' } })
    manager.sync()
    expect(tools.has('wallet_export_proof')).toBe(false)
    expect(tools.has('wallet_get_disclosure_receipt')).toBe(true)
  })

  it('allows exactly one wallet export under a 100-way consent-grant race', async () => {
    const tools = installRegistry()
    let wallet: WalletState = createWalletState()
    const manager = registerWalletTools({
      getState: () => wallet,
      setState: (next) => { wallet = next },
      focusConsent: () => undefined,
    })
    await tools.get('wallet_prepare_disclosure')!.execute({
      audience: SCHOLARSHIP_AUDIENCE,
      purpose: SCHOLARSHIP_PURPOSE,
      claimIds: scholarshipRequirements.map((item) => item.id),
      nonce: 'concurrent-export-100-way',
      challengeExpiresAt: futureChallengeExpiry(),
      expectedVersion: 1,
    })
    wallet = consentToWalletDraft(wallet)
    manager.sync()
    const exportTool = tools.get('wallet_export_proof')!

    const outcomes = await Promise.allSettled(
      Array.from({ length: 100 }, () => exportTool.execute({ expectedVersion: 3 })),
    )

    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1)
    expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(99)
    expect(wallet).toMatchObject({ version: 5, draft: { status: 'exported' } })
    manager.sync()
    expect(tools.has('wallet_export_proof')).toBe(false)
  })

  it('fails a claimed export closed and requires fresh human authorization', async () => {
    const tools = installRegistry()
    let wallet: WalletState = createWalletState()
    const manager = registerWalletTools({
      getState: () => wallet,
      setState: (next) => { wallet = next },
      focusConsent: () => undefined,
    })
    await tools.get('wallet_prepare_disclosure')!.execute({
      audience: SCHOLARSHIP_AUDIENCE,
      purpose: SCHOLARSHIP_PURPOSE,
      claimIds: scholarshipRequirements.map((item) => item.id),
      nonce: 'failed-export-001',
      challengeExpiresAt: futureChallengeExpiry(),
      expectedVersion: 1,
    })
    wallet = consentToWalletDraft(wallet)
    manager.sync()
    const sign = vi.spyOn(crypto.subtle, 'sign').mockRejectedValueOnce(new Error('Synthetic signing failure'))

    await expect(tools.get('wallet_export_proof')!.execute({ expectedVersion: 3 })).rejects.toThrow('Synthetic signing failure')
    sign.mockRestore()

    expect(wallet).toMatchObject({ version: 5, draft: { status: 'failed_closed' } })
    expect(wallet.draft?.exportFailedAt).toBeTruthy()
    manager.sync()
    expect(tools.has('wallet_export_proof')).toBe(false)

    await tools.get('wallet_prepare_disclosure')!.execute({
      audience: SCHOLARSHIP_AUDIENCE,
      purpose: SCHOLARSHIP_PURPOSE,
      claimIds: scholarshipRequirements.map((item) => item.id),
      nonce: 'failed-export-002',
      challengeExpiresAt: futureChallengeExpiry(),
      expectedVersion: 5,
    })
    wallet = consentToWalletDraft(wallet)
    manager.sync()
    await expect(tools.get('wallet_export_proof')!.execute({ expectedVersion: 7 })).resolves.toMatchObject({
      data: { privateFieldsDisclosed: [] },
    })
    expect(wallet).toMatchObject({ version: 9, draft: { status: 'exported' } })
  })

  it('discards an old export after reset even when a new grant reaches the same version', async () => {
    const tools = installRegistry()
    let wallet: WalletState = createWalletState()
    const manager = registerWalletTools({
      getState: () => wallet,
      setState: (next) => { wallet = next },
      focusConsent: () => undefined,
    })
    const prepare = async (nonce: string, expectedVersion: number) => {
      await tools.get('wallet_prepare_disclosure')!.execute({
        audience: SCHOLARSHIP_AUDIENCE,
        purpose: SCHOLARSHIP_PURPOSE,
        claimIds: scholarshipRequirements.map((item) => item.id),
        nonce,
        challengeExpiresAt: futureChallengeExpiry(),
        expectedVersion,
      })
      wallet = consentToWalletDraft(wallet)
      manager.sync()
    }
    await prepare('stale-before-reset', 1)

    const originalSign = crypto.subtle.sign.bind(crypto.subtle)
    const oldStarted = deferred()
    const oldRelease = deferred()
    const freshStarted = deferred()
    const freshRelease = deferred()
    const signingGates = [
      { started: oldStarted, release: oldRelease },
      { started: freshStarted, release: freshRelease },
    ]
    let signingCall = 0
    const sign = vi.spyOn(crypto.subtle, 'sign').mockImplementation(async (algorithm, key, data) => {
      const gate = signingGates[signingCall++]
      gate.started.resolve()
      await gate.release.promise
      return originalSign(algorithm, key, data)
    })

    const oldCall = tools.get('wallet_export_proof')!.execute({ expectedVersion: 3 })
    const oldAssertion = expect(oldCall).rejects.toThrow('authority changed')
    await oldStarted.promise
    const oldOperationId = wallet.draft?.exportOperationId
    expect(wallet).toMatchObject({ version: 4, draft: { status: 'exporting' } })

    wallet = createWalletState()
    manager.sync()
    await prepare('fresh-after-reset', 1)
    const freshCall = tools.get('wallet_export_proof')!.execute({ expectedVersion: 3 })
    await freshStarted.promise
    const freshOperationId = wallet.draft?.exportOperationId
    expect(wallet).toMatchObject({ version: 4, draft: { status: 'exporting' } })
    expect(freshOperationId).not.toBe(oldOperationId)

    oldRelease.resolve()
    await oldAssertion
    expect(wallet.draft?.exportOperationId).toBe(freshOperationId)
    expect(wallet.draft?.status).toBe('exporting')

    freshRelease.resolve()
    await expect(freshCall).resolves.toMatchObject({ data: { nonce: 'fresh-after-reset' } })
    sign.mockRestore()
    expect(wallet).toMatchObject({ version: 5, draft: { status: 'exported' } })
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
      challengeExpiresAt: futureChallengeExpiry(),
      expectedVersion: 0,
    })).rejects.toThrow('Wallet changed')
    expect(wallet.version).toBe(1)
  })

  it('exposes overreach detection as a read-only WebMCP tool before consent', async () => {
    const tools = installRegistry()
    let wallet = createWalletState()
    registerWalletTools({
      getState: () => wallet,
      setState: (next) => { wallet = next },
      focusConsent: () => undefined,
    })

    const response = await tools.get('wallet_evaluate_request')!.execute({
      audience: SCHOLARSHIP_AUDIENCE,
      purpose: SCHOLARSHIP_PURPOSE,
      claimIds: scholarshipRequirements.map((item) => item.id),
      nonce: 'firewall-webmcp-001',
      ttlSeconds: 86_400,
      requestedPrivateFields: ['date_of_birth', 'exact_gpa'],
      requestsAutomaticSubmission: false,
    })

    expect(response).toMatchObject({ data: {
      decision: 'counterproposal',
      reasonCodes: ['RAW_PRIVATE_FIELDS', 'NOT_MINIMUM_DISCLOSURE', 'EXCESSIVE_LIFETIME'],
      dataLeavesWallet: false,
    } })
    expect(wallet).toEqual({ version: 1 })
  })

  it('lets the verifier accept a safe counterproposal without submitting anything', async () => {
    const tools = installRegistry()
    let verifier = createVerifierState()
    registerVerifierTools({
      getState: () => verifier,
      setState: (next) => { verifier = next },
      focusResult: () => undefined,
    })

    const response = await tools.get('fellowship_evaluate_counterproposal')!.execute({
      audience: SCHOLARSHIP_AUDIENCE,
      purpose: SCHOLARSHIP_PURPOSE,
      claimIds: scholarshipRequirements.map((item) => item.id),
      nonce: 'firewall-webmcp-002',
      ttlSeconds: 600,
      requestedPrivateFields: [],
      requestsAutomaticSubmission: false,
    })

    expect(response).toMatchObject({ data: {
      compatible: true,
      next: 'Ask the wallet to prepare this exact request for human review.',
    } })
    expect(verifier).toEqual({ version: 1, status: 'awaiting_proof', usedNonces: [] })
  })

  it('allows one verification inside a single manager when duplicate calls race', async () => {
    const tools = installRegistry()
    let verifier = createVerifierState()
    registerVerifierTools({
      getState: () => verifier,
      setState: (next) => { verifier = next },
      focusResult: () => undefined,
    })
    const request = await tools.get('fellowship_get_requirements')!.execute({}) as { data: { nonce: string; expiresAt: string } }
    expect(tools.get('fellowship_verify_proof')?.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
    })
    const issuedAt = new Date()
    const bundle = await createProofBundle({
      audience: SCHOLARSHIP_AUDIENCE,
      purpose: SCHOLARSHIP_PURPOSE,
      claimIds: scholarshipRequirements.map((item) => item.id),
      nonce: request.data.nonce,
      issuedAt: issuedAt.toISOString(),
      expiresAt: request.data.expiresAt,
    })
    const input = { proofBundle: encodeProofBundle(bundle) }

    const outcomes = await Promise.all([
      tools.get('fellowship_verify_proof')!.execute(input),
      tools.get('fellowship_verify_proof')!.execute(input),
    ]) as Array<{ isError?: boolean }>

    expect(outcomes.filter((item) => item.isError !== true)).toHaveLength(1)
    expect(outcomes.filter((item) => item.isError === true)).toHaveLength(1)
    expect(verifier.usedNonces).toEqual([request.data.nonce])
  })

  it('consumes exactly one verifier challenge under a 100-way proof race', async () => {
    const tools = installRegistry()
    let verifier = createVerifierState()
    registerVerifierTools({
      getState: () => verifier,
      setState: (next) => { verifier = next },
      focusResult: () => undefined,
    })
    const request = await tools.get('fellowship_get_requirements')!.execute({}) as {
      data: { nonce: string; expiresAt: string }
    }
    const issuedAt = new Date()
    const bundle = await createProofBundle({
      audience: SCHOLARSHIP_AUDIENCE,
      purpose: SCHOLARSHIP_PURPOSE,
      claimIds: scholarshipRequirements.map((item) => item.id),
      nonce: request.data.nonce,
      issuedAt: issuedAt.toISOString(),
      expiresAt: request.data.expiresAt,
    })
    const verifyTool = tools.get('fellowship_verify_proof')!
    const input = { proofBundle: encodeProofBundle(bundle) }

    const outcomes = await Promise.all(
      Array.from({ length: 100 }, () => verifyTool.execute(input)),
    ) as Array<{ isError?: boolean; data?: { code?: string } }>

    expect(outcomes.filter((item) => item.isError !== true)).toHaveLength(1)
    expect(outcomes.filter((item) => item.isError === true)).toHaveLength(99)
    expect(outcomes.filter((item) => item.data?.code === 'replayed')).toHaveLength(99)
    expect(verifier.usedNonces).toEqual([request.data.nonce])
  })

  it('uses shared-state compare-and-set across two verifier manager instances', async () => {
    const firstTools = installRegistry()
    let verifier = createVerifierState()
    const bridge = {
      getState: () => verifier,
      setState: (next: VerifierState) => { verifier = next },
      focusResult: () => undefined,
    }
    const firstManager = registerVerifierTools(bridge)
    const request = await firstTools.get('fellowship_get_requirements')!.execute({}) as { data: { nonce: string; expiresAt: string } }
    const secondTools = installRegistry()
    const secondManager = registerVerifierTools(bridge)
    const proofIssuedAt = new Date()
    const bundle = await createProofBundle({
      audience: SCHOLARSHIP_AUDIENCE,
      purpose: SCHOLARSHIP_PURPOSE,
      claimIds: scholarshipRequirements.map((item) => item.id),
      nonce: request.data.nonce,
      issuedAt: proofIssuedAt.toISOString(),
      expiresAt: request.data.expiresAt,
    })
    const input = { proofBundle: encodeProofBundle(bundle) }

    const outcomes = await Promise.all([
      firstTools.get('fellowship_verify_proof')!.execute(input),
      secondTools.get('fellowship_verify_proof')!.execute(input),
    ]) as Array<{ isError?: boolean; data?: { code?: string } }>

    expect(outcomes.filter((item) => item.isError !== true)).toHaveLength(1)
    expect(outcomes.filter((item) => item.data?.code === 'state_changed')).toHaveLength(1)
    expect(verifier.usedNonces).toEqual([request.data.nonce])
    firstManager.dispose()
    secondManager.dispose()
  })

  it('coalesces concurrent requirement calls into one active stored challenge', async () => {
    const tools = installRegistry()
    let verifier = createVerifierState()
    const challengeStore = new InMemoryChallengeStore()
    registerVerifierTools({
      getState: () => verifier,
      setState: (next) => { verifier = next },
      focusResult: () => undefined,
      challengeStore,
    })

    const responses = await Promise.all(
      Array.from({ length: 10 }, () => tools.get('fellowship_get_requirements')!.execute({})),
    ) as Array<{ data: { nonce: string } }>
    const nonces = new Set(responses.map((response) => response.data.nonce))

    expect(nonces).toEqual(new Set([verifier.activeChallenge?.nonce]))
    expect(verifier.version).toBe(2)
    await expect(challengeStore.read(responses[0].data.nonce)).resolves.toMatchObject({ status: 'active' })
    challengeStore.close()
  })

  it('consumes a claimed verifier challenge even when cryptographic verification rejects the proof', async () => {
    const tools = installRegistry()
    let verifier = createVerifierState()
    const challengeStore = new InMemoryChallengeStore()
    registerVerifierTools({
      getState: () => verifier,
      setState: (next) => { verifier = next },
      focusResult: () => undefined,
      challengeStore,
    })
    const request = await tools.get('fellowship_get_requirements')!.execute({}) as {
      data: { nonce: string; expiresAt: string }
    }
    const issuedAt = new Date()
    const bundle = await createProofBundle({
      audience: SCHOLARSHIP_AUDIENCE,
      purpose: SCHOLARSHIP_PURPOSE,
      claimIds: scholarshipRequirements.map((item) => item.id),
      nonce: request.data.nonce,
      issuedAt: issuedAt.toISOString(),
      expiresAt: request.data.expiresAt,
    })
    bundle.holderSignature = `${bundle.holderSignature[0] === 'A' ? 'B' : 'A'}${bundle.holderSignature.slice(1)}`
    const proofBundle = encodeProofBundle(bundle)

    await expect(tools.get('fellowship_verify_proof')!.execute({ proofBundle })).resolves.toMatchObject({
      isError: true,
      data: { code: 'invalid_holder_signature' },
    })
    expect(verifier.usedNonces).toEqual([request.data.nonce])
    await expect(tools.get('fellowship_verify_proof')!.execute({ proofBundle })).resolves.toMatchObject({
      isError: true,
      data: { code: 'replayed', verifierStateChanged: false },
    })
    challengeStore.close()
  })

  it('rejects a valid proof whose nonce was never returned by this verifier', async () => {
    const tools = installRegistry()
    let verifier = createVerifierState()
    registerVerifierTools({
      getState: () => verifier,
      setState: (next) => { verifier = next },
      focusResult: () => undefined,
    })
    await tools.get('fellowship_get_requirements')!.execute({})
    const issuedAt = new Date()
    const bundle = await createProofBundle({
      audience: SCHOLARSHIP_AUDIENCE,
      purpose: SCHOLARSHIP_PURPOSE,
      claimIds: scholarshipRequirements.map((item) => item.id),
      nonce: 'caller-chosen-unissued-nonce',
      issuedAt: issuedAt.toISOString(),
      expiresAt: new Date(issuedAt.getTime() + 600_000).toISOString(),
    })

    const response = await tools.get('fellowship_verify_proof')!.execute({ proofBundle: encodeProofBundle(bundle) })

    expect(response).toMatchObject({ isError: true, data: { code: 'unissued_nonce' } })
    expect(verifier.usedNonces).toEqual([])
  })

  it('issues a fresh challenge after verifier state is reset', async () => {
    const tools = installRegistry()
    let verifier = createVerifierState()
    const manager = registerVerifierTools({
      getState: () => verifier,
      setState: (next) => { verifier = next },
      focusResult: () => undefined,
    })

    const first = await tools.get('fellowship_get_requirements')!.execute({}) as { data: { nonce: string } }
    expect(verifier.activeChallenge?.nonce).toBe(first.data.nonce)

    verifier = createVerifierState()
    manager.sync()
    const second = await tools.get('fellowship_get_requirements')!.execute({}) as { data: { nonce: string } }

    expect(second.data.nonce).not.toBe(first.data.nonce)
    expect(verifier.activeChallenge?.nonce).toBe(second.data.nonce)
  })

  it('replaces a corrupted active challenge instead of returning it again', async () => {
    const tools = installRegistry()
    let verifier = createVerifierState()
    registerVerifierTools({
      getState: () => verifier,
      setState: (next) => { verifier = next },
      focusResult: () => undefined,
    })
    verifier = {
      ...verifier,
      activeChallenge: {
        audience: SCHOLARSHIP_AUDIENCE,
        purpose: SCHOLARSHIP_PURPOSE,
        nonce: 'corrupt-challenge',
        requiredClaimIds: scholarshipRequirements.map((item) => item.id),
        issuedAt: 'not-a-date',
        expiresAt: 'also-not-a-date',
      },
    }

    const response = await tools.get('fellowship_get_requirements')!.execute({}) as { data: { nonce: string; expiresAt: string } }

    expect(response.data.nonce).not.toBe('corrupt-challenge')
    expect(Number.isFinite(Date.parse(response.data.expiresAt))).toBe(true)
    expect(verifier.activeChallenge?.nonce).toBe(response.data.nonce)
  })

  it('replaces a challenge with duplicate policy claims', async () => {
    const tools = installRegistry()
    let verifier = createVerifierState()
    registerVerifierTools({
      getState: () => verifier,
      setState: (next) => { verifier = next },
      focusResult: () => undefined,
    })
    const now = new Date()
    verifier = {
      ...verifier,
      activeChallenge: {
        audience: SCHOLARSHIP_AUDIENCE,
        purpose: SCHOLARSHIP_PURPOSE,
        nonce: 'corrupt-duplicate-challenge',
        requiredClaimIds: [
          ...scholarshipRequirements.map((item) => item.id),
          scholarshipRequirements[0].id,
        ],
        issuedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 10 * 60_000).toISOString(),
      },
    }

    const response = await tools.get('fellowship_get_requirements')!.execute({}) as { data: { nonce: string } }

    expect(response.data.nonce).not.toBe('corrupt-duplicate-challenge')
    expect(verifier.activeChallenge?.requiredClaimIds).toEqual(scholarshipRequirements.map((item) => item.id))
  })

  it('replaces a challenge with an overlong lifetime', async () => {
    const tools = installRegistry()
    let verifier = createVerifierState()
    registerVerifierTools({
      getState: () => verifier,
      setState: (next) => { verifier = next },
      focusResult: () => undefined,
    })
    const now = new Date()
    verifier = {
      ...verifier,
      activeChallenge: {
        audience: SCHOLARSHIP_AUDIENCE,
        purpose: SCHOLARSHIP_PURPOSE,
        nonce: 'corrupt-overlong-challenge',
        requiredClaimIds: scholarshipRequirements.map((item) => item.id),
        issuedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 60 * 60_000).toISOString(),
      },
    }

    const response = await tools.get('fellowship_get_requirements')!.execute({}) as { data: { nonce: string } }

    expect(response.data.nonce).not.toBe('corrupt-overlong-challenge')
    expect(verifier.activeChallenge?.requiredClaimIds).toEqual(scholarshipRequirements.map((item) => item.id))
  })

  it('never extends the absolute verifier challenge expiry in the wallet', async () => {
    const tools = installRegistry()
    let wallet = createWalletState()
    registerWalletTools({
      getState: () => wallet,
      setState: (next) => { wallet = next },
      focusConsent: () => undefined,
    })
    const verifierExpiry = futureChallengeExpiry(30_000)

    await tools.get('wallet_prepare_disclosure')!.execute({
      audience: SCHOLARSHIP_AUDIENCE,
      purpose: SCHOLARSHIP_PURPOSE,
      claimIds: scholarshipRequirements.map((item) => item.id),
      nonce: 'short-lived-challenge',
      challengeExpiresAt: verifierExpiry,
      expectedVersion: 1,
    })

    expect(wallet.draft?.request.expiresAt).toBe(verifierExpiry)
  })

  it('rejects an expired verifier challenge before asking for consent', async () => {
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
      nonce: 'expired-challenge',
      challengeExpiresAt: new Date(Date.now() - 1).toISOString(),
      expectedVersion: 1,
    })).rejects.toThrow('expiry is invalid or has already passed')
    expect(wallet).toEqual({ version: 1 })
  })

  it('blocks approval and withdraws export when a prepared request expires', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-04T03:00:00.000Z'))
    const tools = installRegistry()
    let wallet = createWalletState()
    const manager = registerWalletTools({
      getState: () => wallet,
      setState: (next) => { wallet = next },
      focusConsent: () => undefined,
    })
    const prepare = async (nonce: string, expectedVersion: number) => {
      await tools.get('wallet_prepare_disclosure')!.execute({
        audience: SCHOLARSHIP_AUDIENCE,
        purpose: SCHOLARSHIP_PURPOSE,
        claimIds: scholarshipRequirements.map((item) => item.id),
        nonce,
        challengeExpiresAt: futureChallengeExpiry(1_000),
        expectedVersion,
      })
    }

    await prepare('expires-before-consent', 1)
    vi.advanceTimersByTime(1_001)
    expect(() => consentToWalletDraft(wallet)).toThrow('expired')

    vi.setSystemTime(new Date('2026-09-04T03:10:00.000Z'))
    wallet = createWalletState()
    manager.sync()
    await prepare('expires-after-consent', 1)
    wallet = consentToWalletDraft(wallet)
    manager.sync()
    const exportTool = tools.get('wallet_export_proof')!
    vi.advanceTimersByTime(1_001)

    await expect(exportTool.execute({ expectedVersion: 3 })).rejects.toThrow('expired before export')
    expect(wallet).toMatchObject({ version: 4, draft: { status: 'expired' } })
    manager.sync()
    expect(tools.has('wallet_export_proof')).toBe(false)
  })

  it('discards an in-flight verification result after verifier reset', async () => {
    const tools = installRegistry()
    let verifier = createVerifierState()
    const manager = registerVerifierTools({
      getState: () => verifier,
      setState: (next) => { verifier = next },
      focusResult: () => undefined,
    })
    const firstRequest = await tools.get('fellowship_get_requirements')!.execute({}) as { data: { nonce: string; expiresAt: string } }
    const issuedAt = new Date()
    const bundle = await createProofBundle({
      audience: SCHOLARSHIP_AUDIENCE,
      purpose: SCHOLARSHIP_PURPOSE,
      claimIds: scholarshipRequirements.map((item) => item.id),
      nonce: firstRequest.data.nonce,
      issuedAt: issuedAt.toISOString(),
      expiresAt: firstRequest.data.expiresAt,
    })

    const originalVerify = crypto.subtle.verify.bind(crypto.subtle)
    const verifyStarted = deferred()
    const verifyRelease = deferred()
    const verify = vi.spyOn(crypto.subtle, 'verify').mockImplementationOnce(async (algorithm, key, signature, data) => {
      verifyStarted.resolve()
      await verifyRelease.promise
      return originalVerify(algorithm, key, signature, data)
    })
    const staleCall = tools.get('fellowship_verify_proof')!.execute({ proofBundle: encodeProofBundle(bundle) })
    await verifyStarted.promise

    verifier = createVerifierState()
    manager.sync()
    const freshRequest = await tools.get('fellowship_get_requirements')!.execute({}) as { data: { nonce: string } }
    expect(freshRequest.data.nonce).not.toBe(firstRequest.data.nonce)

    verifyRelease.resolve()
    await expect(staleCall).resolves.toMatchObject({
      isError: true,
      data: { code: 'state_changed', verifierStateChanged: false },
    })
    verify.mockRestore()
    expect(verifier).toMatchObject({
      status: 'awaiting_proof',
      activeChallenge: { nonce: freshRequest.data.nonce },
      usedNonces: [],
    })
  })

  it('rejects a proof that expires while asynchronous verification is in flight', async () => {
    vi.useFakeTimers()
    const startedAt = new Date('2026-09-04T04:00:00.000Z')
    vi.setSystemTime(startedAt)
    const tools = installRegistry()
    let verifier = createVerifierState()
    registerVerifierTools({
      getState: () => verifier,
      setState: (next) => { verifier = next },
      focusResult: () => undefined,
    })
    const request = await tools.get('fellowship_get_requirements')!.execute({}) as {
      data: { nonce: string }
    }
    const bundle = await createProofBundle({
      audience: SCHOLARSHIP_AUDIENCE,
      purpose: SCHOLARSHIP_PURPOSE,
      claimIds: scholarshipRequirements.map((item) => item.id),
      nonce: request.data.nonce,
      issuedAt: startedAt.toISOString(),
      expiresAt: new Date(startedAt.getTime() + 500).toISOString(),
    })
    const originalVerify = crypto.subtle.verify.bind(crypto.subtle)
    const verifyStarted = deferred()
    const verifyRelease = deferred()
    const verify = vi.spyOn(crypto.subtle, 'verify').mockImplementationOnce(async (algorithm, key, signature, data) => {
      verifyStarted.resolve()
      await verifyRelease.promise
      return originalVerify(algorithm, key, signature, data)
    })

    const inFlight = tools.get('fellowship_verify_proof')!.execute({ proofBundle: encodeProofBundle(bundle) })
    await verifyStarted.promise
    vi.advanceTimersByTime(500)
    verifyRelease.resolve()

    await expect(inFlight).resolves.toMatchObject({ isError: true, data: { code: 'expired' } })
    verify.mockRestore()
    expect(verifier).toMatchObject({ status: 'rejected', result: { code: 'expired' }, usedNonces: [] })
  })

  it('starts a fresh verifier attempt without carrying an old submission receipt', async () => {
    const tools = installRegistry()
    let verifier = createVerifierState()
    registerVerifierTools({
      getState: () => verifier,
      setState: (next) => { verifier = next },
      focusResult: () => undefined,
    })
    const first = await tools.get('fellowship_get_requirements')!.execute({}) as { data: { nonce: string; expiresAt: string } }
    const proofIssuedAt = new Date()
    const bundle = await createProofBundle({
      audience: SCHOLARSHIP_AUDIENCE,
      purpose: SCHOLARSHIP_PURPOSE,
      claimIds: scholarshipRequirements.map((item) => item.id),
      nonce: first.data.nonce,
      issuedAt: proofIssuedAt.toISOString(),
      expiresAt: first.data.expiresAt,
    })
    await tools.get('fellowship_verify_proof')!.execute({ proofBundle: encodeProofBundle(bundle) })
    verifier = submitVerifiedApplication(verifier)
    expect(verifier.submittedAt).toBeTruthy()

    const fresh = await tools.get('fellowship_get_requirements')!.execute({}) as { data: { nonce: string } }

    expect(fresh.data.nonce).not.toBe(first.data.nonce)
    expect(verifier).toMatchObject({ status: 'awaiting_proof', usedNonces: [first.data.nonce] })
    expect(verifier.result).toBeUndefined()
    expect(verifier.proof).toBeUndefined()
    expect(verifier.submittedAt).toBeUndefined()
  })

  it('returns a structured recoverable denial for malformed proof input', async () => {
    const tools = installRegistry()
    let verifier = createVerifierState()
    registerVerifierTools({
      getState: () => verifier,
      setState: (next) => { verifier = next },
      focusResult: () => undefined,
    })

    const response = await tools.get('fellowship_verify_proof')!.execute({ proofBundle: 'not-a-proof-bundle' })

    expect(response).toMatchObject({
      isError: true,
      data: {
        code: 'invalid_envelope',
        recover: 'Ask the wallet for a fresh session-scoped proof bundle, then retry verification once.',
      },
    })
    expect(verifier).toMatchObject({ status: 'rejected', result: { accepted: false, code: 'invalid_envelope' } })
  })

  it('returns a structured denial when a decoded proof violates verifier policy', async () => {
    const tools = installRegistry()
    let verifier = createVerifierState()
    registerVerifierTools({
      getState: () => verifier,
      setState: (next) => { verifier = next },
      focusResult: () => undefined,
    })
    const issuedAt = new Date()
    const bundle = await createProofBundle({
      audience: SCHOLARSHIP_AUDIENCE,
      purpose: SCHOLARSHIP_PURPOSE,
      claimIds: scholarshipRequirements.map((item) => item.id),
      nonce: 'policy-denial-001',
      issuedAt: issuedAt.toISOString(),
      expiresAt: new Date(issuedAt.getTime() + 600_000).toISOString(),
    })
    Object.assign(bundle, { purpose: 'Use this proof to decide a loan.' })

    const response = await tools.get('fellowship_verify_proof')!.execute({ proofBundle: encodeProofBundle(bundle) })

    expect(response).toMatchObject({ isError: true, data: { code: 'wrong_purpose' } })
    expect(verifier).toMatchObject({ status: 'rejected', result: { code: 'wrong_purpose' } })
  })
})
