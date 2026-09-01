import { readFile, readdir } from 'node:fs/promises'
import { basename, resolve } from 'node:path'

const assetsDirectory = resolve(new URL('../dist/assets', import.meta.url).pathname)
const files = (await readdir(assetsDirectory)).filter((file) => file.endsWith('.js'))
const secretMarkers = ['FiDbtU9snUn25RtpoOGNq0EANEiIkegPbThCSZVmsnM', 'raven-41', 'maple-22']
const rawRecordMarkers = ['Maya Rahman', '2004-11-18', 'OBU-447-219', '18 Willow Lane', 'openbridge-2026-7F3A']
const findings = []

for (const file of files) {
  const body = await readFile(resolve(assetsDirectory, file), 'utf8')
  const hasWalletSecret = secretMarkers.some((marker) => body.includes(marker))
  const rawRecordValues = rawRecordMarkers.filter((marker) => body.includes(marker))
  findings.push({ file: basename(file), hasWalletSecret, rawRecordValues })
}

const walletChunks = findings.filter((finding) => finding.file.startsWith('walletWebmcp-'))
const secretOutsideWallet = findings.filter((finding) => !finding.file.startsWith('walletWebmcp-') && finding.hasWalletSecret)
const rawRecordLeaks = findings.filter((finding) => finding.rawRecordValues.length > 0)

if (walletChunks.length !== 1 || !walletChunks[0].hasWalletSecret || secretOutsideWallet.length || rawRecordLeaks.length) {
  process.stderr.write(`${JSON.stringify({ success: false, findings }, null, 2)}\n`)
  process.exit(1)
}

process.stdout.write(`${JSON.stringify({
  success: true,
  assertion: 'Wallet signing fixtures exist only in the wallet runtime chunk; raw synthetic record values exist in no production chunk.',
  findings,
}, null, 2)}\n`)
