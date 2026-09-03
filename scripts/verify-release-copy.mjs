import { readFile } from 'node:fs/promises'

const evalReceipt = JSON.parse(await readFile('artifacts/evals/scenario-results.json', 'utf8'))
const releaseReceipt = JSON.parse(await readFile('artifacts/release/verification.json', 'utf8'))
const browserTotal = releaseReceipt.checks.find((check) => check.name === 'browser journeys')?.total
const scenarioTotal = evalReceipt.total

const checks = [
  ['README.md', [`${scenarioTotal} adversarial scenarios`, `${scenarioTotal} named adversarial judge scenarios`]],
  ['docs/DEVPOST_SUBMISSION.md', [`${scenarioTotal} named adversarial scenarios`, `${browserTotal} Playwright checks`]],
  ['docs/EVALS.md', [`${scenarioTotal} named scenarios`]],
  ['docs/DEMO_SCRIPT.md', [`${scenarioTotal} of ${scenarioTotal} adversarial matrix`, `${scenarioTotal} adversarial scenarios`, `${browserTotal} browser journeys`]],
  ['src/App.tsx', [`${scenarioTotal}/${scenarioTotal} attacks`, `${browserTotal}/${browserTotal} browser journeys`]],
  ['e2e/proof-courier.spec.ts', [`${scenarioTotal}/${scenarioTotal}`, `${browserTotal}/${browserTotal}`]],
]

const failures = []
for (const [path, expectedFragments] of checks) {
  const body = await readFile(path, 'utf8')
  for (const fragment of expectedFragments) {
    if (!body.includes(fragment)) failures.push(`${path} is missing ${JSON.stringify(fragment)}`)
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exitCode = 1
} else {
  console.log(`Release copy matches ${scenarioTotal} scenarios and ${browserTotal} browser journeys.`)
}
