import { readFile, writeFile } from 'node:fs/promises'

const sourcePath = new URL('../artifacts/evals/.vitest-results.json', import.meta.url)
const outputPath = new URL('../artifacts/evals/scenario-results.json', import.meta.url)
const raw = JSON.parse(await readFile(sourcePath, 'utf8'))
const scenarios = raw.testResults.flatMap((suite) => suite.assertionResults.map((assertion) => ({
  id: assertion.title.match(/^E\d+/)?.[0] ?? 'unknown',
  title: assertion.title.replace(/^E\d+\s*/, ''),
  status: assertion.status,
})))
const receipt = {
  suite: 'Recon Room judge scenarios',
  command: 'npm run eval',
  success: raw.success,
  passed: raw.numPassedTests,
  failed: raw.numFailedTests,
  total: raw.numTotalTests,
  scenarios,
}

await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`)
