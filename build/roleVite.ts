import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import type { Plugin, UserConfig } from 'vite'

export type BuildRole = 'wallet' | 'verifier' | 'showcase'

type RoleOptions = {
  role: BuildRole
  forbiddenModules: string[]
}

export function createRoleConfig({ role, forbiddenModules }: RoleOptions): UserConfig {
  const root = resolve(process.cwd(), 'apps', role)
  return {
    root,
    appType: 'mpa',
    plugins: [react(), enforceRoleBoundary(role, forbiddenModules)],
    build: {
      outDir: resolve(process.cwd(), 'dist-roles', role),
      emptyOutDir: true,
      manifest: true,
      sourcemap: false,
      rolldownOptions: {
        output: {
          entryFileNames: `assets/${role}-[hash].js`,
          chunkFileNames: `assets/${role}-[name]-[hash].js`,
          assetFileNames: `assets/${role}-[name]-[hash][extname]`,
        },
      },
    },
  }
}

function enforceRoleBoundary(role: BuildRole, forbiddenModules: string[]): Plugin {
  return {
    name: `proof-courier-${role}-boundary`,
    generateBundle(_options, bundle) {
      const violations = new Set<string>()
      for (const artifact of Object.values(bundle)) {
        if (artifact.type !== 'chunk') continue
        for (const moduleId of Object.keys(artifact.modules)) {
          const normalized = moduleId.replaceAll('\\', '/')
          for (const forbidden of forbiddenModules) {
            if (normalized.includes(forbidden)) violations.add(`${artifact.fileName}: ${normalized}`)
          }
        }
      }
      if (violations.size > 0) {
        this.error(`${role} build crossed a role boundary:\n${[...violations].join('\n')}`)
      }
    },
  }
}
