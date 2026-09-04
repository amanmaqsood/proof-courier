import { defineConfig } from 'vite'
import { createRoleConfig } from './build/roleVite.ts'

export default defineConfig(createRoleConfig({
  role: 'wallet',
  forbiddenModules: ['/src/verifierWebmcp.ts', '/src/verifier/'],
}))
