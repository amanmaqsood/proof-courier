import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { executeSmokeEvals } from '../node_modules/webmcp-evals/dist/evaluator/index.js'

const targets = [
  { name: 'wallet', url: 'http://127.0.0.1:5173/wallet', evals: 'evals/webmcp/wallet-smoke.json' },
  { name: 'verifier', url: 'http://127.0.0.1:5173/fellowship', evals: 'evals/webmcp/verifier-smoke.json' },
]

const packageMetadata = JSON.parse(await readFile('node_modules/webmcp-evals/package.json', 'utf8'))
const runs = []
let server

async function proofCourierIsReady() {
  try {
    const response = await fetch('http://127.0.0.1:5173/')
    return response.ok && (await response.text()).includes('<title>Proof Courier')
  } catch {
    return false
  }
}

if (!(await proofCourierIsReady())) {
  server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1'], { stdio: 'inherit' })
  for (let attempt = 0; attempt < 50 && !(await proofCourierIsReady()); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  if (!(await proofCourierIsReady())) {
    server.kill('SIGTERM')
    throw new Error('Proof Courier did not become ready at http://127.0.0.1:5173/.')
  }
}

try {
  for (const target of targets) {
    const tests = JSON.parse(await readFile(target.evals, 'utf8'))
    const result = await executeSmokeEvals(tests, {
      url: target.url,
      chromeChannel: 'chrome',
      verbose: true,
    })
    runs.push({ ...target, ...result })
  }
} finally {
  server?.kill('SIGTERM')
}

const receipt = {
  generatedAt: new Date().toISOString(),
  runner: `GoogleChromeLabs webmcp-evals ${packageMetadata.version}`,
  mode: 'smoke (direct live tool execution; no LLM or API key)',
  passedSteps: runs.reduce((sum, run) => sum + run.passCount, 0),
  totalSteps: runs.reduce((sum, run) => sum + run.totalExpectedSteps, 0),
  errorCount: runs.reduce((sum, run) => sum + run.errorCount, 0),
  runs,
}

await mkdir('artifacts/evals/third-party', { recursive: true })
await writeFile('artifacts/evals/third-party/webmcp-smoke.json', `${JSON.stringify(receipt, null, 2)}\n`)

console.log(`WebMCP smoke: ${receipt.passedSteps}/${receipt.totalSteps} live steps passed.`)
if (receipt.errorCount > 0) process.exitCode = 1
