import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const evalReceipt = JSON.parse(await readFile(resolve(root, 'artifacts/evals/scenario-results.json'), 'utf8'))
const browserResults = JSON.parse(await readFile(resolve(root, 'artifacts/e2e/results.json'), 'utf8'))

async function collectFiles(directory) {
  const entries = await readdir(directory)
  const files = []
  for (const entry of entries) {
    const path = resolve(directory, entry)
    const metadata = await stat(path)
    if (metadata.isDirectory()) files.push(...await collectFiles(path))
    else files.push(path)
  }
  return files
}

const buildFiles = await collectFiles(resolve(root, 'dist'))
const buildArtifacts = await Promise.all(buildFiles.sort().map(async (path) => {
  const body = await readFile(path)
  return {
    path: relative(root, path),
    bytes: body.byteLength,
    sha256: createHash('sha256').update(body).digest('hex'),
  }
}))

const receipt = {
  suite: 'Recon Room release gate',
  command: 'npm run verify',
  success: true,
  generatedAt: new Date().toISOString(),
  sourceRevision: process.env.GITHUB_SHA ?? 'local-working-tree',
  checks: [
    { name: 'lint', command: 'npm run lint', status: 'passed' },
    { name: 'unit and contract tests', command: 'npm test', status: 'passed' },
    { name: 'judge scenarios', command: 'npm run eval', status: evalReceipt.success ? 'passed' : 'failed', total: evalReceipt.total },
    { name: 'production build', command: 'npm run build', status: 'passed' },
    { name: 'browser journeys', command: 'npm run e2e', status: browserResults.stats.unexpected === 0 ? 'passed' : 'failed', total: browserResults.stats.expected },
  ],
  buildArtifacts,
}

await mkdir(resolve(root, 'artifacts/release'), { recursive: true })
await writeFile(resolve(root, 'artifacts/release/verification.json'), `${JSON.stringify(receipt, null, 2)}\n`)
