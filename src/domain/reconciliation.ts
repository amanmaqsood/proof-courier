export type Actor = 'agent' | 'human'
export type CaseStatus = 'needs_review' | 'in_review' | 'ready' | 'approved'
export type DiscrepancyField = 'quantity' | 'unitPrice' | 'taxRate'

export interface SourceValues {
  purchaseOrder: number | null
  goodsReceipt: number | null
  invoice: number | null
}

export interface Discrepancy {
  id: string
  field: DiscrepancyField
  label: string
  values: SourceValues
  severity: 'blocking' | 'review'
  guidance: string
}

export interface ResolutionDraft {
  discrepancyId: string
  selectedValue: number
  reason: string
  actor: Actor
  createdAt: string
}

export interface ActivityEvent {
  id: string
  actor: Actor
  action: 'resolution_staged' | 'case_approved'
  message: string
  createdAt: string
}

export interface SourceRecord {
  id: string
  type: 'purchase_order' | 'goods_receipt' | 'supplier_invoice'
  reference: string
  issuedAt: string
  quantity: number
  unitPrice: number | null
  taxRate: number | null
  currency: 'USD'
}

export interface ReconciliationCase {
  id: string
  vendor: string
  item: string
  dueLabel: string
  status: CaseStatus
  version: number
  records: [SourceRecord, SourceRecord, SourceRecord]
  drafts: Record<string, ResolutionDraft>
  activity: ActivityEvent[]
  approvedAt?: string
}

export interface StageResolutionInput {
  discrepancyId: string
  selectedValue: number
  reason: string
  actor: Actor
  expectedVersion: number
}

const discrepancyDefinitions: Array<{
  id: string
  field: DiscrepancyField
  label: string
  severity: Discrepancy['severity']
  guidance: string
}> = [
  {
    id: 'qty-001',
    field: 'quantity',
    label: 'Delivered quantity',
    severity: 'blocking',
    guidance: 'Confirm whether the short delivery is accepted or still outstanding.',
  },
  {
    id: 'price-001',
    field: 'unitPrice',
    label: 'Unit price',
    severity: 'blocking',
    guidance: 'Use the contracted price unless an authorized price change exists.',
  },
  {
    id: 'tax-001',
    field: 'taxRate',
    label: 'Tax rate',
    severity: 'review',
    guidance: 'Check the supplier invoice tax treatment before approval.',
  },
]

export function createSeedCase(): ReconciliationCase {
  return {
    id: 'RR-1042',
    vendor: 'Northstar Office Supply',
    item: 'Ergonomic task chairs',
    dueLabel: 'Due tomorrow',
    status: 'needs_review',
    version: 1,
    records: [
      {
        id: 'po-7842',
        type: 'purchase_order',
        reference: 'PO-7842',
        issuedAt: 'Aug 26, 2026',
        quantity: 24,
        unitPrice: 145,
        taxRate: 18,
        currency: 'USD',
      },
      {
        id: 'gr-2196',
        type: 'goods_receipt',
        reference: 'GR-2196',
        issuedAt: 'Aug 30, 2026',
        quantity: 22,
        unitPrice: null,
        taxRate: null,
        currency: 'USD',
      },
      {
        id: 'inv-5531',
        type: 'supplier_invoice',
        reference: 'INV-5531',
        issuedAt: 'Aug 31, 2026',
        quantity: 24,
        unitPrice: 148,
        taxRate: 12,
        currency: 'USD',
      },
    ],
    drafts: {},
    activity: [],
  }
}

export function compareCase(caseState: ReconciliationCase): Discrepancy[] {
  const [purchaseOrder, goodsReceipt, invoice] = caseState.records
  const values: Record<DiscrepancyField, SourceValues> = {
    quantity: {
      purchaseOrder: purchaseOrder.quantity,
      goodsReceipt: goodsReceipt.quantity,
      invoice: invoice.quantity,
    },
    unitPrice: {
      purchaseOrder: purchaseOrder.unitPrice,
      goodsReceipt: goodsReceipt.unitPrice,
      invoice: invoice.unitPrice,
    },
    taxRate: {
      purchaseOrder: purchaseOrder.taxRate,
      goodsReceipt: goodsReceipt.taxRate,
      invoice: invoice.taxRate,
    },
  }

  return discrepancyDefinitions.flatMap((definition) => {
    const sourceValues = values[definition.field]
    const knownValues = Object.values(sourceValues).filter((value): value is number => value !== null)
    return new Set(knownValues).size > 1 ? [{ ...definition, values: sourceValues }] : []
  })
}

export function getReviewState(caseState: ReconciliationCase) {
  const discrepancies = compareCase(caseState)
  const unresolved = discrepancies.filter((item) => !caseState.drafts[item.id])
  return {
    caseId: caseState.id,
    version: caseState.version,
    status: caseState.status,
    discrepancyCount: discrepancies.length,
    unresolvedCount: unresolved.length,
    unresolvedIds: unresolved.map((item) => item.id),
    readyForHumanApproval: unresolved.length === 0 && caseState.status !== 'approved',
    approvalBoundary: 'Only a human can approve. Approval never initiates payment.',
  }
}

function now() {
  return new Date().toISOString()
}

export function stageResolution(caseState: ReconciliationCase, input: StageResolutionInput) {
  if (caseState.status === 'approved') throw new Error('Approved cases cannot be changed.')
  if (input.expectedVersion !== caseState.version) {
    throw new Error('Case changed. Inspect it again before staging a resolution.')
  }
  const discrepancy = compareCase(caseState).find((item) => item.id === input.discrepancyId)
  if (!discrepancy) throw new Error('Discrepancy not found. Compare the case again.')
  if (!Number.isFinite(input.selectedValue)) throw new Error('Selected value must be a finite number.')
  if (input.reason.trim().length < 8) throw new Error('Explain the resolution in at least 8 characters.')

  const createdAt = now()
  const draft: ResolutionDraft = { ...input, reason: input.reason.trim(), createdAt }
  const nextDrafts = { ...caseState.drafts, [input.discrepancyId]: draft }
  const unresolvedCount = compareCase(caseState).filter((item) => !nextDrafts[item.id]).length
  const receipt: ActivityEvent = {
    id: `activity-${caseState.activity.length + 1}`,
    actor: input.actor,
    action: 'resolution_staged',
    message: `${input.actor === 'agent' ? 'Agent' : 'Aman'} staged ${discrepancy.label}: ${input.selectedValue}.`,
    createdAt,
  }
  const nextCase: ReconciliationCase = {
    ...caseState,
    status: unresolvedCount === 0 ? 'ready' : 'in_review',
    version: caseState.version + 1,
    drafts: nextDrafts,
    activity: [...caseState.activity, receipt],
  }
  return { case: nextCase, receipt }
}

export function approveCase(caseState: ReconciliationCase, actor: Actor) {
  if (actor !== 'human') throw new Error('Only a human can approve this case.')
  if (!getReviewState(caseState).readyForHumanApproval) {
    throw new Error('Resolve every discrepancy before approval.')
  }
  const createdAt = now()
  const receipt: ActivityEvent = {
    id: `activity-${caseState.activity.length + 1}`,
    actor,
    action: 'case_approved',
    message: 'Aman approved the reconciled record. No payment was initiated.',
    createdAt,
  }
  return {
    case: {
      ...caseState,
      status: 'approved' as const,
      version: caseState.version + 1,
      approvedAt: createdAt,
      activity: [...caseState.activity, receipt],
    },
    receipt,
  }
}
