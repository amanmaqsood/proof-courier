import {
  compareCase,
  getReviewState,
  stageResolution,
  type ReconciliationCase,
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
      registerTool(tool: ToolDefinition): void | Promise<void>
      unregisterTool?(name: string): void | Promise<void>
    }
  }
}

interface Bridge {
  getCase: () => ReconciliationCase
  setCase: (next: ReconciliationCase) => void
  focusDiscrepancy: (id?: string) => void
}

const emptyObjectSchema = { type: 'object', properties: {}, additionalProperties: false }

function toolResult(summary: string, data: unknown) {
  return { summary, data }
}

export function registerReconRoomTools(bridge: Bridge) {
  const context = document.modelContext
  if (!context) return { supported: false, toolNames: [] as string[] }

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
      name: 'stage_resolution',
      description: 'Stages one reversible field resolution with visible agent attribution. It never approves or pays.',
      inputSchema: {
        type: 'object',
        properties: {
          caseId: { type: 'string', description: 'Case ID to update.' },
          discrepancyId: { type: 'string', enum: ['qty-001', 'price-001', 'tax-001'] },
          selectedValue: { type: 'number', description: 'Proposed numeric value for the field.' },
          reason: { type: 'string', minLength: 8, description: 'Evidence-based reason for this draft.' },
          expectedVersion: { type: 'number', description: 'Version returned by inspect_case or get_review_state.' },
        },
        required: ['caseId', 'discrepancyId', 'selectedValue', 'reason', 'expectedVersion'],
        additionalProperties: false,
      },
      execute: ({ caseId, discrepancyId, selectedValue, reason, expectedVersion }) => {
        const current = bridge.getCase()
        if (caseId !== current.id) throw new Error(`Case ${String(caseId)} was not found. Call list_cases first.`)
        const result = stageResolution(current, {
          discrepancyId: String(discrepancyId),
          selectedValue: Number(selectedValue),
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
        })
      },
    },
    {
      name: 'get_review_state',
      description: 'Reads unresolved items and whether the case is ready for human-only approval.',
      inputSchema: {
        type: 'object',
        properties: { caseId: { type: 'string', description: 'Case ID to review.' } },
        required: ['caseId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: ({ caseId }) => {
        const current = bridge.getCase()
        if (caseId !== current.id) throw new Error(`Case ${String(caseId)} was not found. Call list_cases first.`)
        return toolResult('Current review state.', getReviewState(current))
      },
    },
  ]

  for (const tool of tools) context.registerTool(tool)
  return { supported: true, toolNames: tools.map((tool) => tool.name) }
}
