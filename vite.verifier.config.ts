import { defineConfig } from 'vite'
import { createRoleConfig } from './build/roleVite.ts'

export default defineConfig(createRoleConfig({
  role: 'verifier',
  forbiddenModules: ['/src/walletWebmcp.ts', '/src/wallet/', '/src/domain/proofCourier.ts'],
}))
