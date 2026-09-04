import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const results = JSON.parse(await readFile(resolve(root, 'artifacts/e2e/production-results.json'), 'utf8'))
if (results.stats.unexpected !== 0 || results.stats.expected !== 1) {
  throw new Error('Production cross-origin journey did not pass exactly once.')
}

const sourceRevision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
const receipt = {
  suite: 'Proof Courier deployed cross-origin journey',
  command: 'npm run e2e:production',
  success: true,
  generatedAt: new Date().toISOString(),
  sourceRevision,
  verifierUrl: 'https://proof-courier-verifier.vercel.app/fellowship',
  walletUrl: 'https://proof-courier-wallet.vercel.app/wallet',
  assertions: [
    'Wallet and verifier have different browser origins.',
    'Wallet local storage is not visible to the verifier.',
    'Neither page fetches resources from the peer origin.',
    'An overreaching request releases zero data and receives a safe counterproposal.',
    'Only visible human consent registers the single-call export capability in the tested wallet session.',
    'The verifier accepts the agent-carried proof and final submission remains human-only.',
  ],
}

await mkdir(resolve(root, 'artifacts/release'), { recursive: true })
await writeFile(resolve(root, 'artifacts/release/production-cross-origin.json'), `${JSON.stringify(receipt, null, 2)}\n`)
