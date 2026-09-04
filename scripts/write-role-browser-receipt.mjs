import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const raw = JSON.parse(await readFile(resolve(root, 'artifacts/e2e/role-results.json'), 'utf8'))
const total = raw.stats.expected
const failed = raw.stats.unexpected

const receipt = {
  suite: 'Proof Courier isolated role browser journey',
  command: 'npm run e2e:roles',
  success: total === 1 && failed === 0,
  generatedAt: new Date().toISOString(),
  total,
  passed: total - failed,
  failed,
  assertions: [
    'Verifier, wallet, and showcase pages execute from three independent emitted artifacts and processes.',
    'Each role exposes only its intended WebMCP tool surface; showcase exposes no operational tools.',
    'The verifier request is counterproposed, prepared, visibly approved, atomically exported, and verified.',
    'Zero private fields cross the wallet boundary and no agent submission capability appears.',
    'Peer role routes return 404, required security headers are present, and no peer-origin resource fetch occurs.',
  ],
}

await mkdir(resolve(root, 'artifacts/release'), { recursive: true })
await writeFile(resolve(root, 'artifacts/release/role-browser.json'), `${JSON.stringify(receipt, null, 2)}\n`)

if (!receipt.success) {
  console.error('The isolated role browser journey did not produce exactly one passing result.')
  process.exitCode = 1
}
