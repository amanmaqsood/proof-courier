import { defineConfig } from 'vite'
import { createRoleConfig } from './build/roleVite.ts'

export default defineConfig(createRoleConfig({
  role: 'showcase',
  forbiddenModules: [
    '/src/walletWebmcp.ts',
    '/src/verifierWebmcp.ts',
    '/src/wallet/',
    '/src/verifier/',
    '/src/domain/proofCourier.ts',
    '/src/domain/proofVerifier.ts',
  ],
}))
