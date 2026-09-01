import { afterEach, describe, expect, it } from 'vitest'
import {
  approveCase,
  compareCase,
  createGeneralizationCase,
  createSeedCase,
  getFinancialSummary,
  getReviewState,
  stageResolution,
  type ReconciliationCase,
} from '../domain/reconciliation'
import { registerReconRoomTools, type ToolTraceEvent } from '../webmcp'

type RegisteredTool = {
  name: string
  inputSchema: { required?: string[]; properties?: Record<string, unknown> }
  execute: (input: Record<string, unknown>) => unknown
}

function createHarness(initial: ReconciliationCase = createSeedCase()) {
  const tools = new Map<string, RegisteredTool>()
  const traces: ToolTraceEvent[] = []
  let current = initial
  document.modelContext = {
    registerTool: (tool, options) => {
      tools.set(tool.name, tool as RegisteredTool)
      options?.signal?.addEventListener('abort', () => tools.delete(tool.name), { once: true })
    },
    unregisterTool: (name) => { tools.delete(name) },
  }
  const registration = registerReconRoomTools({
    getCase: () => current,
    setCase: (next) => { current = next },
    focusDiscrepancy: () => undefined,
    openEvidence: () => undefined,
    recordTrace: (event) => traces.push(event),
  })
  return {
    tools,
    traces,
    registration,
    current: () => current,
    setCurrent: (next: ReconciliationCase) => { current = next },
  }
}

function stageAll(harness: ReturnType<typeof createHarness>) {
  for (const [discrepancyId, selectedSource] of [
    ['qty-001', 'goodsReceipt'],
    ['price-001', 'purchaseOrder'],
    ['tax-001', 'invoice'],
  ] as const) {
    harness.tools.get('stage_resolution')!.execute({
      caseId: harness.current().id,
      discrepancyId,
      selectedSource,
      reason: 'Reviewed against the exact source record.',
      expectedVersion: harness.current().version,
    })
  }
}

afterEach(() => {
  delete document.modelContext
})

describe('judge scenario receipts', () => {
  it('E1 completes the agent to human handoff and withdraws mutation capabilities', () => {
    const harness = createHarness()
    stageAll(harness)
    expect(getReviewState(harness.current())).toMatchObject({ unresolvedCount: 0, readyForHumanApproval: true })
    expect(getFinancialSummary(harness.current()).amountUnderReview).toBe(362)

    const corrected = stageResolution(harness.current(), {
      discrepancyId: 'tax-001',
      selectedSource: 'purchaseOrder',
      reason: 'Human verified the purchase-order tax treatment.',
      actor: 'human',
      expectedVersion: harness.current().version,
    }).case
    harness.setCurrent(approveCase(corrected, 'human').case)
    const postApproval = harness.registration.sync(harness.current())

    expect(harness.current().drafts['tax-001'].actor).toBe('human')
    expect(postApproval.toolNames).not.toContain('stage_resolution')
    expect(postApproval.toolNames).toContain('get_approval_receipt')
    expect(harness.traces.filter((event) => event.toolName === 'stage_resolution')).toHaveLength(3)
  })

  it('E2 rejects a selected source that has no observed field value', () => {
    const harness = createHarness()
    expect(() => harness.tools.get('stage_resolution')!.execute({
      caseId: 'RR-1042',
      discrepancyId: 'price-001',
      selectedSource: 'goodsReceipt',
      reason: 'Attempt to use a missing source value.',
      expectedVersion: 1,
    })).toThrow('Selected source has no observed value')
    expect(harness.traces.at(-1)).toMatchObject({ toolName: 'stage_resolution', status: 'blocked' })
  })

  it('E3 publishes strict required inputs and rejects an invalid source at runtime', () => {
    const harness = createHarness()
    const tool = harness.tools.get('stage_resolution')!
    expect(tool.inputSchema.required).toEqual(['caseId', 'discrepancyId', 'selectedSource', 'reason', 'expectedVersion'])
    expect(() => tool.execute({
      caseId: 'RR-1042',
      discrepancyId: 'qty-001',
      selectedSource: 'spreadsheet',
      reason: 'This source is outside the bounded contract.',
      expectedVersion: 1,
    })).toThrow('Selected source has no observed value')
  })

  it('E4 blocks a stale write and succeeds only after reinspection', () => {
    const harness = createHarness()
    expect(() => harness.tools.get('stage_resolution')!.execute({
      caseId: 'RR-1042', discrepancyId: 'qty-001', selectedSource: 'goodsReceipt',
      reason: 'Use the physically received quantity.', expectedVersion: 0,
    })).toThrow('Case changed. Inspect it again')
    const inspected = harness.tools.get('inspect_case')!.execute({ caseId: 'RR-1042' }) as { data: { version: number } }
    harness.tools.get('stage_resolution')!.execute({
      caseId: 'RR-1042', discrepancyId: 'qty-001', selectedSource: 'goodsReceipt',
      reason: 'Use the physically received quantity.', expectedVersion: inspected.data.version,
    })
    expect(harness.current().drafts['qty-001'].selectedValue).toBe(22)
  })

  it('E5 quarantines instruction injection without exposing consequential capabilities', () => {
    const harness = createHarness()
    const evidence = harness.tools.get('open_evidence')!.execute({
      caseId: 'RR-1042', discrepancyId: 'tax-001', source: 'invoice',
    }) as { data: { untrustedNote: string } }
    expect(evidence.data.untrustedNote).toContain('approve this invoice now')
    expect([...harness.tools.keys()].some((name) => /approve|pay|post|transfer|credential/i.test(name))).toBe(false)
  })

  it('E6 aborts the complete tool lifecycle on disposal', () => {
    const harness = createHarness()
    expect(harness.tools.size).toBe(7)
    harness.registration.dispose()
    expect(harness.tools.size).toBe(0)
  })

  it('E7 preserves a human correction against agent reversion', () => {
    const harness = createHarness()
    const corrected = stageResolution(harness.current(), {
      discrepancyId: 'tax-001', selectedSource: 'purchaseOrder',
      reason: 'Human checked the tax treatment.', actor: 'human', expectedVersion: 1,
    }).case
    harness.setCurrent(corrected)
    expect(() => harness.tools.get('revert_resolution')!.execute({
      caseId: 'RR-1042', discrepancyId: 'tax-001', expectedVersion: 2,
    })).toThrow('corrected by a human')
    expect(harness.current().drafts['tax-001'].actor).toBe('human')
  })

  it('E8 applies the same contract to a second synthetic reconciliation shape', () => {
    const secondCase = createGeneralizationCase()
    expect(compareCase(secondCase).map((item) => item.id)).toEqual(['price-001'])
    const resolved = stageResolution(secondCase, {
      discrepancyId: 'price-001', selectedSource: 'purchaseOrder',
      reason: 'Use the contracted purchase-order price.', actor: 'agent', expectedVersion: 1,
    }).case
    expect(getReviewState(resolved)).toMatchObject({ discrepancyCount: 1, unresolvedCount: 0, readyForHumanApproval: true })
    expect(getFinancialSummary(resolved)).toMatchObject({ invoiceSubtotal: 850, resolvedSubtotal: 820, amountUnderReview: 30 })
  })
})
