import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { roleNames, startRoleArtifactServer } from './role-artifact-server.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const role = process.argv[2]
const port = Number(process.argv[3])

if (!roleNames.includes(role) || !Number.isInteger(port) || port < 1 || port > 65_535) {
  console.error('Usage: node scripts/serve-role-artifact.mjs <wallet|verifier|showcase> <port>')
  process.exit(1)
}

const server = await startRoleArtifactServer({ root, role, port })
console.log(`Serving ${role} artifact at http://127.0.0.1:${port}`)

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
