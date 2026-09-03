import type { ProofTraceEvent } from './proofState'

export type ToolDefinition = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  annotations?: Record<string, unknown>
  execute: (input: Record<string, unknown>) => unknown | Promise<unknown>
}

type ModelContext = {
  registerTool(tool: ToolDefinition, options?: { signal?: AbortSignal }): void | Promise<void>
}

declare global {
  interface Document {
    modelContext?: ModelContext
  }
}

export type ToolManager = {
  supported: boolean
  toolNames: string[]
  sync: () => { supported: boolean; toolNames: string[] }
  dispose: () => void
}

export function createDynamicManager(
  definitions: ToolDefinition[],
  desiredNames: () => string[],
  recordTrace?: (event: ProofTraceEvent) => void,
): ToolManager {
  const context = document.modelContext
  if (!context) return { supported: false, toolNames: [], sync: () => ({ supported: false, toolNames: [] }), dispose: () => undefined }
  const byName = new Map(definitions.map((definition) => [definition.name, withTrace(definition, recordTrace)]))
  const controllers = new Map<string, AbortController>()

  function sync() {
    const desired = desiredNames()
    const desiredSet = new Set(desired)
    for (const [name, controller] of controllers) {
      if (!desiredSet.has(name)) {
        controller.abort()
        controllers.delete(name)
      }
    }
    for (const name of desired) {
      if (!controllers.has(name)) {
        const controller = new AbortController()
        controllers.set(name, controller)
        context!.registerTool(byName.get(name)!, { signal: controller.signal })
      }
    }
    return { supported: true, toolNames: desired }
  }

  const initial = sync()
  return {
    ...initial,
    sync,
    dispose: () => {
      for (const controller of controllers.values()) controller.abort()
      controllers.clear()
    },
  }
}

export function requireVersion(current: number, expected: number) {
  if (current !== expected) throw new Error(`Wallet changed from version ${expected} to ${current}. Re-read the consent state before continuing.`)
}

export function result(summary: string, data: unknown) {
  return { summary, data }
}

export function errorResult(summary: string, data: unknown) {
  return { isError: true as const, summary, data }
}

export const emptySchema = { type: 'object', properties: {}, additionalProperties: false }

function withTrace(definition: ToolDefinition, recordTrace?: (event: ProofTraceEvent) => void): ToolDefinition {
  return {
    ...definition,
    execute: async (input) => {
      try {
        const output = await definition.execute(input)
        const blocked = Boolean(output && typeof output === 'object' && 'isError' in output && output.isError === true)
        recordTrace?.({ toolName: definition.name, status: blocked ? 'blocked' : 'succeeded', summary: traceSummary(output), createdAt: new Date().toISOString() })
        return output
      } catch (error) {
        recordTrace?.({ toolName: definition.name, status: 'blocked', summary: error instanceof Error ? error.message : 'Tool call blocked.', createdAt: new Date().toISOString() })
        throw error
      }
    },
  }
}

function traceSummary(value: unknown) {
  return value && typeof value === 'object' && 'summary' in value && typeof value.summary === 'string'
    ? value.summary
    : 'Tool call completed.'
}
