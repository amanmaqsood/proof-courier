import { readFile } from 'node:fs/promises'

const evalReceipt = JSON.parse(await readFile('artifacts/evals/scenario-results.json', 'utf8'))
const browserResults = JSON.parse(await readFile('artifacts/e2e/results.json', 'utf8'))
const browserTotal = browserResults.stats.expected
const scenarioTotal = evalReceipt.total

const checks = [
  ['README.md', [`${scenarioTotal} adversarial scenarios`, `${scenarioTotal} named adversarial judge scenarios`]],
  ['docs/DEVPOST_SUBMISSION.md', [`${scenarioTotal} named adversarial scenarios`, `${browserTotal} Playwright checks`]],
  ['docs/EVALS.md', [`${scenarioTotal} named scenarios`]],
  ['src/App.tsx', [`${scenarioTotal}/${scenarioTotal} attacks`, `${browserTotal}/${browserTotal} browser checks`]],
  ['e2e/proof-courier.spec.ts', [`${scenarioTotal}/${scenarioTotal}`, `${browserTotal}/${browserTotal}`]],
  ['README.md', ['active verifier session', 'Atomic transactions allow one claim across tested reload and cross-tab races', 'does **not** prove role-specific build isolation']],
  ['docs/DEVPOST_SUBMISSION.md', ['same-origin browser storage', 'verifier challenge and replay state remain in memory', 'shared application artifact']],
  ['src/App.tsx', ['native receipt predates the IndexedDB wallet wiring', 'Verifier challenge and replay state remain limited to one active in-memory verifier session', 'same application artifact rather than role-isolated builds']],
  ['artifacts/release/production-cross-origin.json', ['single-call proof export capability in the tested wallet session', 'production journey was not re-run for this wording-only correction']],
]

const forbiddenClaims = [
  ['README.md', ['default demonstration nonce is static', 'wallet/verifier bundle-isolation checks']],
  ['docs/DEVPOST_SUBMISSION.md', ['exposes a one-time proof export tool']],
  ['src/App.tsx', ['Session export unlocked', 'A capability that lives for exactly one call.', '32 courses sealed']],
  ['artifacts/release/production-cross-origin.json', ['one-use proof export capability']],
]

const failures = []
for (const [path, expectedFragments] of checks) {
  const body = await readFile(path, 'utf8')
  for (const fragment of expectedFragments) {
    if (!body.includes(fragment)) failures.push(`${path} is missing ${JSON.stringify(fragment)}`)
  }
}

for (const [path, prohibitedFragments] of forbiddenClaims) {
  const body = await readFile(path, 'utf8')
  for (const fragment of prohibitedFragments) {
    if (body.includes(fragment)) failures.push(`${path} still contains prohibited unqualified claim ${JSON.stringify(fragment)}`)
  }
}

const demoScript = await readFile('docs/DEMO_SCRIPT.md', 'utf8')
const demoScenarioPatterns = [
  `${scenarioTotal} of ${scenarioTotal} adversarial matrix`,
  `${scenarioTotal} of ${scenarioTotal} adversarial scenarios`,
]
if (!demoScenarioPatterns.some((fragment) => demoScript.includes(fragment))) {
  failures.push(`docs/DEMO_SCRIPT.md is missing one of ${JSON.stringify(demoScenarioPatterns)}`)
}
const demoBrowserPatterns = [
  '6 browser journeys',
  'six browser journeys',
]
if (!demoBrowserPatterns.some((fragment) => demoScript.toLowerCase().includes(fragment))) {
  failures.push(`docs/DEMO_SCRIPT.md is missing one of ${JSON.stringify(demoBrowserPatterns)}`)
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exitCode = 1
} else {
  console.log(`Maintained release copy matches ${scenarioTotal} scenarios, ${browserTotal} browser checks, and the current session/build limitations.`)
  console.warn('Owner-managed docs/DEMO_SCRIPT.md is checked for counts only; its security wording remains excluded from claim certification until the owner approves an edit.')
}
