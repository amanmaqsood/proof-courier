import { describe, expect, it } from 'vitest'
import {
  approveCase,
  compareCase,
  createSeedCase,
  getReviewState,
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
      selectedValue: 22,
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
      selectedValue: 148,
      reason: 'Use invoice price.',
      actor: 'agent',
      expectedVersion: 1,
    }).case
    const corrected = stageResolution(first, {
      discrepancyId: 'price-001',
      selectedValue: 145,
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
      ['qty-001', 22, 'Use received quantity.'],
      ['price-001', 145, 'Use contracted PO price.'],
      ['tax-001', 18, 'Use supplier tax rate after review.'],
    ] as const

    for (const [discrepancyId, selectedValue, reason] of resolutions) {
      caseState = stageResolution(caseState, {
        discrepancyId,
        selectedValue,
        reason,
        actor: 'agent',
        expectedVersion: caseState.version,
      }).case
    }

    expect(getReviewState(caseState)).toMatchObject({ readyForHumanApproval: true, unresolvedCount: 0 })
  })

  it('allows only a human to approve a ready case', () => {
    let caseState = createSeedCase()
    for (const [discrepancyId, selectedValue] of [
      ['qty-001', 22],
      ['price-001', 145],
      ['tax-001', 18],
    ] as const) {
      caseState = stageResolution(caseState, {
        discrepancyId,
        selectedValue,
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
        selectedValue: 22,
        reason: 'Use received quantity.',
        actor: 'agent',
        expectedVersion: 0,
      }),
    ).toThrow('Case changed. Inspect it again before staging a resolution.')
  })
})
