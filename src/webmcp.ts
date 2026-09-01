import {
  compareCase,
  getEvidence,
  getFinancialSummary,
  getReviewState,
  revertResolution,
  stageResolution,
  type ReconciliationCase,
  type EvidenceSource,
  type StageResolutionInput,
} from './domain/reconciliation'

type ToolDefinition = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  annotations?: Record<string, unknown>
  execute: (input: Record<string, unknown>) => unknown | Promise<unknown>
}

declare global {
  interface Document {
    modelContext?: {
      registerTool(tool: ToolDefinition, options?: { signal?: AbortSignal }): void | Promise<void>
      unregisterTool?(name: string): void | Promise<void>
    }
  }
}

interface Bridge {
  getCase: () => ReconciliationCase
  setCase: (next: ReconciliationCase) => void
  focusDiscrepancy: (id?: string) => void
  openEvidence: (discrepancyId: string, source: EvidenceSource) => void
  recordTrace?: (event: ToolTraceEvent) => void
}

export type ToolTraceEvent = {
  toolName: string
  channel: 'webmcp' | 'preview' | 'human'
  status: 'succeeded' | 'blocked'
  summary: string
  createdAt: string
}

const emptyObjectSchema = { type: 'object', properties: {}, additionalProperties: false }

function toolResult(summary: string, data: unknown) {
  return { summary, data }
}

export function registerReconRoomTools(bridge: Bridge) {
  const context = document.modelContext
  if (!context) {
    return {
      supported: false,
      toolNames: [] as string[],
      sync: (_caseState: ReconciliationCase) => ({ supported: false, toolNames: [] as string[] }),
      dispose: () => undefined,
    }
  }
  const modelContext = context
  const lifecycle = new AbortController()

  const tools: ToolDefinition[] = [
    {
      name: 'list_cases',
      description: 'Lists reconciliation cases visible in Recon Room with their status and urgency.',
      inputSchema: emptyObjectSchema,
      annotations: { readOnlyHint: true },
      execute: () => {
        const current = bridge.getCase()
        return toolResult('Found 1 synthetic reconciliation case.', [
          { id: current.id, vendor: current.vendor, status: current.status, due: current.dueLabel },
        ])
      },
    },
    {
      name: 'inspect_case',
      description: 'Reads the bounded purchase order, goods receipt, invoice, drafts, and version for one case.',
      inputSchema: {
        type: 'object',
        properties: { caseId: { type: 'string', description: 'Case ID, for example RR-1042.' } },
        required: ['caseId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: ({ caseId }) => {
        const current = bridge.getCase()
        if (caseId !== current.id) throw new Error(`Case ${String(caseId)} was not found. Call list_cases first.`)
        return toolResult(`Case ${current.id} is at version ${current.version}.`, {
          id: current.id,
          vendor: current.vendor,
          item: current.item,
          status: current.status,
          version: current.version,
          records: current.records,
          drafts: current.drafts,
        })
      },
    },
    {
      name: 'compare_records',
      description: 'Runs deterministic three-way matching and focuses the discrepancy workspace in the visible UI.',
      inputSchema: {
        type: 'object',
        properties: { caseId: { type: 'string', description: 'Case ID to compare.' } },
        required: ['caseId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: ({ caseId }) => {
        const current = bridge.getCase()
        if (caseId !== current.id) throw new Error(`Case ${String(caseId)} was not found. Call list_cases first.`)
        const discrepancies = compareCase(current)
        bridge.focusDiscrepancy(discrepancies[0]?.id)
        return toolResult(`Found ${discrepancies.length} field-level discrepancies.`, discrepancies)
      },
    },
    {
      name: 'open_evidence',
      description: 'Opens and returns the exact source anchor for one discrepancy value in the visible UI.',
      inputSchema: {
        type: 'object',
        properties: {
          caseId: { type: 'string', description: 'Case ID containing the discrepancy.' },
          discrepancyId: { type: 'string', enum: ['qty-001', 'price-001', 'tax-001'] },
          source: { type: 'string', enum: ['purchaseOrder', 'goodsReceipt', 'invoice'], description: 'Source record to open.' },
        },
        required: ['caseId', 'discrepancyId', 'source'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: ({ caseId, discrepancyId, source }) => {
        const current = bridge.getCase()
        if (caseId !== current.id) throw new Error(`Case ${String(caseId)} was not found. Call list_cases first.`)
        const evidenceSource = String(source) as EvidenceSource
        const evidence = getEvidence(current, String(discrepancyId), evidenceSource)
        bridge.focusDiscrepancy(String(discrepancyId))
        bridge.openEvidence(String(discrepancyId), evidenceSource)
        return toolResult(`Opened ${evidence.reference} at ${evidence.locator}.`, evidence)
      },
    },
    {
      name: 'get_review_state',
      description: 'Reads unresolved items and whether the case is ready for human-only approval.',
      inputSchema: {
        type: 'object',
        properties: {
          caseId: { type: 'string', description: 'Case ID to review.' },
        },
        required: ['caseId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: ({ caseId }) => {
        const current = bridge.getCase()
        if (caseId !== current.id) throw new Error(`Case ${String(caseId)} was not found. Call list_cases first.`)
        return toolResult('Current review state.', {
          ...getReviewState(current),
          financialSummary: getFinancialSummary(current),
        })
      },
    },
    {
      name: 'stage_resolution',
      description: 'Stages one reversible field resolution with visible agent attribution. It never approves or pays.',
      inputSchema: {
        type: 'object',
        properties: {
          caseId: { type: 'string', description: 'Case ID to update.' },
          discrepancyId: { type: 'string', enum: ['qty-001', 'price-001', 'tax-001'] },
          selectedSource: { type: 'string', enum: ['purchaseOrder', 'goodsReceipt', 'invoice'], description: 'Immutable source record whose observed value should be used.' },
          reason: { type: 'string', minLength: 8, description: 'Evidence-based reason for this draft.' },
          expectedVersion: { type: 'number', description: 'Version returned by inspect_case or get_review_state.' },
        },
        required: ['caseId', 'discrepancyId', 'selectedSource', 'reason', 'expectedVersion'],
        additionalProperties: false,
      },
      execute: ({ caseId, discrepancyId, selectedSource, reason, expectedVersion }) => {
        const current = bridge.getCase()
        if (caseId !== current.id) throw new Error(`Case ${String(caseId)} was not found. Call list_cases first.`)
        const result = stageResolution(current, {
          discrepancyId: String(discrepancyId),
          selectedSource: String(selectedSource) as EvidenceSource,
          reason: String(reason),
          expectedVersion: Number(expectedVersion),
          actor: 'agent',
        } satisfies StageResolutionInput)
        bridge.setCase(result.case)
        bridge.focusDiscrepancy(String(discrepancyId))
        return toolResult(result.receipt.message, {
          newVersion: result.case.version,
          status: result.case.status,
          reviewState: getReviewState(result.case),
          financialSummary: getFinancialSummary(result.case),
        })
      },
    },
    {
      name: 'revert_resolution',
      description: 'Reverts one current agent-authored draft. Human corrections are protected from agent reversion.',
      inputSchema: {
        type: 'object',
        properties: {
          caseId: { type: 'string', description: 'Case ID to update.' },
          discrepancyId: { type: 'string', enum: ['qty-001', 'price-001', 'tax-001'] },
          expectedVersion: { type: 'number', description: 'Current case version.' },
        },
        required: ['caseId', 'discrepancyId', 'expectedVersion'],
        additionalProperties: false,
      },
      execute: ({ caseId, discrepancyId, expectedVersion }) => {
        const current = bridge.getCase()
        if (caseId !== current.id) throw new Error(`Case ${String(caseId)} was not found. Call list_cases first.`)
        const result = revertResolution(current, {
          discrepancyId: String(discrepancyId),
          expectedVersion: Number(expectedVersion),
          actor: 'agent',
        })
        bridge.setCase(result.case)
        bridge.focusDiscrepancy(String(discrepancyId))
        return toolResult(result.receipt.message, {
          newVersion: result.case.version,
          reviewState: getReviewState(result.case),
        })
      },
    },
    {
      name: 'get_approval_receipt',
      description: 'Reads the immutable human approval receipt after a case is approved. It never initiates payment.',
      inputSchema: {
        type: 'object',
        properties: { caseId: { type: 'string', description: 'Approved case ID.' } },
        required: ['caseId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: ({ caseId }) => {
        const current = bridge.getCase()
        if (caseId !== current.id) throw new Error(`Case ${String(caseId)} was not found. Call list_cases first.`)
        if (current.status !== 'approved' || !current.approvedAt) {
          throw new Error('This case has no approval receipt. Resolve every discrepancy and ask the human to approve it.')
        }
        return toolResult(`Human approval receipt for ${current.id}. No payment was initiated.`, {
          caseId: current.id,
          approvedBy: 'Aman',
          approvedAt: current.approvedAt,
          version: current.version,
          paymentInitiated: false,
          resolutions: current.drafts,
          financialSummary: getFinancialSummary(current),
        })
      },
    },
  ]

  for (const tool of tools) {
    const execute = tool.execute
    tool.execute = (input) => {
      const record = (status: ToolTraceEvent['status'], summary: string) => bridge.recordTrace?.({
        toolName: tool.name,
        channel: 'webmcp',
        status,
        summary,
        createdAt: new Date().toISOString(),
      })
      try {
        const result = execute(input)
        if (result && typeof result === 'object' && 'then' in result) {
          return Promise.resolve(result).then(
            (value) => {
              record('succeeded', traceSummary(value))
              return value
            },
            (error: unknown) => {
              record('blocked', error instanceof Error ? error.message : 'Tool call was blocked.')
              throw error
            },
          )
        }
        record('succeeded', traceSummary(result))
        return result
      } catch (error) {
        record('blocked', error instanceof Error ? error.message : 'Tool call was blocked.')
        throw error
      }
    }
  }

  const toolsByName = new Map(tools.map((tool) => [tool.name, tool]))
  const activeNames = new Set<string>()

  function desiredNames(caseState: ReconciliationCase) {
    const base = ['list_cases', 'inspect_case', 'compare_records', 'open_evidence', 'get_review_state']
    return caseState.status === 'approved'
      ? [...base, 'get_approval_receipt']
      : [...base, 'stage_resolution', 'revert_resolution']
  }

  function sync(caseState: ReconciliationCase) {
    const desired = desiredNames(caseState)
    const desiredSet = new Set(desired)
    if (modelContext.unregisterTool) {
      for (const name of activeNames) {
        if (!desiredSet.has(name)) {
          modelContext.unregisterTool(name)
          activeNames.delete(name)
        }
      }
    }
    for (const name of desired) {
      if (!activeNames.has(name)) {
        modelContext.registerTool(toolsByName.get(name)!, { signal: lifecycle.signal })
        activeNames.add(name)
      }
    }
    return { supported: true, toolNames: desired }
  }

  const initial = sync(bridge.getCase())
  function dispose() {
    lifecycle.abort()
    activeNames.clear()
  }
  return { ...initial, sync, dispose }
}

function traceSummary(result: unknown) {
  if (result && typeof result === 'object' && 'summary' in result && typeof result.summary === 'string') {
    return result.summary
  }
  return 'Tool call completed.'
}
