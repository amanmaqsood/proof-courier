import { describe, expect, it } from 'vitest'
import {
  approveCase,
  compareCase,
  createSeedCase,
  getFinancialSummary,
  getEvidence,
  getReviewState,
  revertResolution,
  stageResolution,
} from './reconciliation'

describe('reconciliation case', () => {
  it('finds the known quantity, unit price, and tax discrepancies', () => {
    const result = compareCase(createSeedCase())

    expect(result.map((item) => item.field)).toEqual([
      'quantity',
      'unitPrice',
      'taxRate',
    ])
    expect(result[0].values).toEqual({ purchaseOrder: 24, goodsReceipt: 22, invoice: 24 })
  })

  it('stages a reversible resolution without approving the case', () => {
    const draft = stageResolution(createSeedCase(), {
      discrepancyId: 'qty-001',
      selectedSource: 'goodsReceipt',
      reason: 'Use the quantity physically received.',
      actor: 'agent',
      expectedVersion: 1,
    })

    expect(draft.case.status).toBe('in_review')
    expect(draft.case.version).toBe(2)
    expect(draft.case.drafts['qty-001']).toMatchObject({ selectedValue: 22, actor: 'agent' })
    expect(draft.receipt.action).toBe('resolution_staged')
  })

  it('replaces an agent draft with the human correction and preserves attribution', () => {
    const first = stageResolution(createSeedCase(), {
      discrepancyId: 'price-001',
      selectedSource: 'invoice',
      reason: 'Use invoice price.',
      actor: 'agent',
      expectedVersion: 1,
    }).case
    const corrected = stageResolution(first, {
      discrepancyId: 'price-001',
      selectedSource: 'purchaseOrder',
      reason: 'PO price is contractually agreed.',
      actor: 'human',
      expectedVersion: 2,
    }).case

    expect(corrected.drafts['price-001']).toMatchObject({ selectedValue: 145, actor: 'human' })
    expect(corrected.activity.map((event) => event.actor)).toEqual(['agent', 'human'])
  })

  it('reports readiness only after every discrepancy has a draft', () => {
    let caseState = createSeedCase()
    const resolutions = [
      ['qty-001', 'goodsReceipt', 'Use received quantity.'],
      ['price-001', 'purchaseOrder', 'Use contracted PO price.'],
      ['tax-001', 'purchaseOrder', 'Use purchase-order tax rate after review.'],
    ] as const

    for (const [discrepancyId, selectedSource, reason] of resolutions) {
      caseState = stageResolution(caseState, {
        discrepancyId,
        selectedSource,
        reason,
        actor: 'agent',
        expectedVersion: caseState.version,
      }).case
    }

    expect(getReviewState(caseState)).toMatchObject({ readyForHumanApproval: true, unresolvedCount: 0 })
  })

  it('allows only a human to approve a ready case', () => {
    let caseState = createSeedCase()
    for (const [discrepancyId, selectedSource] of [
      ['qty-001', 'goodsReceipt'],
      ['price-001', 'purchaseOrder'],
      ['tax-001', 'purchaseOrder'],
    ] as const) {
      caseState = stageResolution(caseState, {
        discrepancyId,
        selectedSource,
        reason: 'Reviewed against source records.',
        actor: 'agent',
        expectedVersion: caseState.version,
      }).case
    }

    expect(() => approveCase(caseState, 'agent')).toThrow('Only a human can approve this case.')
    expect(approveCase(caseState, 'human').case.status).toBe('approved')
  })

  it('rejects stale agent writes', () => {
    expect(() =>
      stageResolution(createSeedCase(), {
        discrepancyId: 'qty-001',
        selectedSource: 'goodsReceipt',
        reason: 'Use received quantity.',
        actor: 'agent',
        expectedVersion: 0,
      }),
    ).toThrow('Case changed. Inspect it again before staging a resolution.')
  })

  it('quantifies the pre-tax amount protected by the current drafts', () => {
    let caseState = createSeedCase()
    caseState = stageResolution(caseState, {
      discrepancyId: 'qty-001',
      selectedSource: 'goodsReceipt',
      reason: 'Use the quantity physically received.',
      actor: 'agent',
      expectedVersion: caseState.version,
    }).case
    caseState = stageResolution(caseState, {
      discrepancyId: 'price-001',
      selectedSource: 'purchaseOrder',
      reason: 'Use the contracted purchase-order price.',
      actor: 'agent',
      expectedVersion: caseState.version,
    }).case

    expect(getFinancialSummary(caseState)).toEqual({
      invoiceSubtotal: 3552,
      resolvedSubtotal: 3190,
      amountUnderReview: 362,
      currency: 'USD',
      complete: true,
    })
  })

  it('lets an agent revert its own draft but not a human correction', () => {
    const agentDraft = stageResolution(createSeedCase(), {
      discrepancyId: 'qty-001',
      selectedSource: 'goodsReceipt',
      reason: 'Use the quantity physically received.',
      actor: 'agent',
      expectedVersion: 1,
    }).case
    const reverted = revertResolution(agentDraft, {
      discrepancyId: 'qty-001',
      actor: 'agent',
      expectedVersion: 2,
    }).case

    expect(reverted.drafts['qty-001']).toBeUndefined()
    expect(reverted.activity.at(-1)?.action).toBe('resolution_reverted')

    const humanDraft = stageResolution(createSeedCase(), {
      discrepancyId: 'tax-001',
      selectedSource: 'purchaseOrder',
      reason: 'Human reviewed the tax treatment.',
      actor: 'human',
      expectedVersion: 1,
    }).case
    expect(() => revertResolution(humanDraft, {
      discrepancyId: 'tax-001',
      actor: 'agent',
      expectedVersion: 2,
    })).toThrow('The current draft was corrected by a human and cannot be reverted by the agent.')
  })

  it('returns an exact source anchor for a discrepancy value', () => {
    expect(getEvidence(createSeedCase(), 'qty-001', 'goodsReceipt')).toEqual({
      caseId: 'RR-1042',
      discrepancyId: 'qty-001',
      field: 'quantity',
      source: 'goodsReceipt',
      sourceLabel: 'Goods receipt',
      reference: 'GR-2196',
      locator: 'Page 1 · Line 05',
      excerpt: 'Quantity received 22 EA',
      observedValue: 22,
      untrustedNote: null,
      synthetic: true,
    })
  })

  it('rejects a source that has no observed value instead of accepting an invented number', () => {
    expect(() => stageResolution(createSeedCase(), {
      discrepancyId: 'price-001',
      selectedSource: 'goodsReceipt',
      reason: 'Try to use a missing receipt price.',
      actor: 'agent',
      expectedVersion: 1,
    })).toThrow('Selected source has no observed value for this discrepancy.')
  })
})
