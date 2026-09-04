import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { relative, resolve } from 'node:path'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const roles = ['wallet', 'verifier', 'showcase']
const primaryRoutes = { wallet: '/wallet', verifier: '/fellowship', showcase: '/' }
const securityHeaderNames = [
  'Content-Security-Policy',
  'Cross-Origin-Opener-Policy',
  'Permissions-Policy',
  'Referrer-Policy',
  'X-Content-Type-Options',
  'X-Frame-Options',
]
const holderPrivateMarker = 'FiDbtU9snUn25RtpoOGNq0EANEiIkegPbThCSZVmsnM'
const rawPrivateMarkers = ['Maya Rahman', '2004-11-18', 'OBU-447-219', '3.74', '18 Willow Lane']
const failures = []
const roleReceipts = []

for (const role of roles) {
  const directory = resolve(root, 'dist-roles', role)
  const deploymentConfigPath = resolve(root, `vercel.${role}.json`)
  const deploymentConfigBody = await readFile(deploymentConfigPath)
  const deploymentConfig = JSON.parse(deploymentConfigBody.toString('utf8'))
  const files = await collectFiles(directory)
  const manifest = JSON.parse(await readFile(resolve(directory, '.vite', 'manifest.json'), 'utf8'))
  const moduleSources = Object.keys(manifest)
  const artifacts = []
  let javascript = ''

  verifyDeploymentConfig(role, deploymentConfig)

  for (const path of files) {
    const body = await readFile(path)
    const projectPath = relative(root, path).replaceAll('\\', '/')
    if (path.endsWith('.map')) failures.push(`${role} emitted a source map: ${projectPath}`)
    if (projectPath.includes('/assets/')) {
      const filename = projectPath.split('/').at(-1)
      if (!filename?.startsWith(`${role}-`)) failures.push(`${role} emitted an unscoped asset: ${projectPath}`)
    }
    if (path.endsWith('.js')) javascript += `\n${body.toString('utf8')}`
    artifacts.push({
      path: projectPath,
      bytes: body.byteLength,
      sha256: createHash('sha256').update(body).digest('hex'),
    })
  }

  for (const marker of rawPrivateMarkers) {
    if (javascript.includes(marker)) failures.push(`${role} client artifact contains raw synthetic record marker ${JSON.stringify(marker)}`)
  }
  if (role === 'wallet') {
    if (!javascript.includes('wallet_get_summary')) failures.push('wallet artifact is missing its WebMCP tool implementation')
    if (!moduleSources.includes('../../src/walletWebmcp.ts')) failures.push('wallet manifest is missing the wallet WebMCP entry')
    if (moduleSources.includes('../../src/verifierWebmcp.ts')) failures.push('wallet manifest contains the verifier WebMCP entry')
    if (!javascript.includes(holderPrivateMarker)) failures.push('wallet artifact is missing the currently documented signing fixture marker')
  } else if (javascript.includes(holderPrivateMarker)) {
    failures.push(`${role} artifact contains wallet signing material`)
  }
  if (role === 'verifier') {
    if (!javascript.includes('fellowship_get_requirements')) failures.push('verifier artifact is missing its WebMCP tool implementation')
    if (!moduleSources.includes('../../src/verifierWebmcp.ts')) failures.push('verifier manifest is missing the verifier WebMCP entry')
    if (moduleSources.includes('../../src/walletWebmcp.ts')) failures.push('verifier manifest contains the wallet WebMCP entry')
  }
  if (role === 'showcase' && moduleSources.some((source) => /\/(?:wallet|verifier)Webmcp\.ts$/u.test(source))) {
    failures.push('showcase manifest contains an operational role WebMCP entry')
  }

  roleReceipts.push({
    role,
    entryFile: manifest['index.html'].file,
    moduleSources,
    deploymentConfig: {
      path: relative(root, deploymentConfigPath).replaceAll('\\', '/'),
      sha256: createHash('sha256').update(deploymentConfigBody).digest('hex'),
      primaryRoute: primaryRoutes[role],
      securityHeaders: securityHeaderNames,
    },
    artifacts,
  })
}

const routeChecks = await verifyHttpIsolation(roleReceipts)

const receipt = {
  suite: 'Proof Courier role artifact isolation',
  command: 'npm run verify:roles',
  success: failures.length === 0,
  generatedAt: new Date().toISOString(),
  assertions: [
    'Each role has an independent HTML entry and role-prefixed assets.',
    'Build-time module graph guards reject forbidden role imports.',
    'Wallet signing material is absent from verifier and showcase artifacts.',
    'Raw synthetic record values are absent from every client artifact.',
    'No source maps are emitted.',
    'Role deployment configs preserve the required security headers and exact route tables.',
    'Each role route and entry chunk is served only by its own simulated deployment origin.',
  ],
  roles: roleReceipts,
  routeChecks,
  failures,
}

await mkdir(resolve(root, 'artifacts/release'), { recursive: true })
await writeFile(resolve(root, 'artifacts/release/role-builds.json'), `${JSON.stringify(receipt, null, 2)}\n`)

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exitCode = 1
} else {
  console.log('Role artifact isolation passed for wallet, verifier, and showcase builds.')
}

async function collectFiles(directory) {
  const entries = await readdir(directory)
  const files = []
  for (const entry of entries) {
    const path = resolve(directory, entry)
    const metadata = await stat(path)
    if (metadata.isDirectory()) files.push(...await collectFiles(path))
    else files.push(path)
  }
  return files.sort()
}

function verifyDeploymentConfig(role, config) {
  if (config.$schema !== 'https://openapi.vercel.sh/vercel.json') failures.push(`${role} deployment config is missing the Vercel schema`)
  if (config.buildCommand !== `npm run build:${role}`) failures.push(`${role} deployment config has the wrong build command`)
  if (config.outputDirectory !== `dist-roles/${role}`) failures.push(`${role} deployment config has the wrong output directory`)

  const configuredHeaders = new Set(config.headers?.flatMap((entry) => entry.headers ?? []).map((header) => header.key))
  for (const header of securityHeaderNames) {
    if (!configuredHeaders.has(header)) failures.push(`${role} deployment config is missing ${header}`)
  }

  const rewriteSources = (config.rewrites ?? []).map((rewrite) => rewrite.source)
  const redirectSources = (config.redirects ?? []).map((redirect) => redirect.source)
  const allowedRewriteSources = role === 'showcase' ? ['/evidence'] : [primaryRoutes[role]]
  if (JSON.stringify(rewriteSources) !== JSON.stringify(allowedRewriteSources)) {
    failures.push(`${role} deployment config has an unexpected rewrite table: ${JSON.stringify(rewriteSources)}`)
  }
  const allowedRedirectSources = role === 'showcase' ? [] : ['/']
  if (JSON.stringify(redirectSources) !== JSON.stringify(allowedRedirectSources)) {
    failures.push(`${role} deployment config has an unexpected redirect table: ${JSON.stringify(redirectSources)}`)
  }
  if ([...rewriteSources, ...redirectSources].some((source) => source.includes('(.*)') || source.includes(':path*'))) {
    failures.push(`${role} deployment config contains a catch-all route`)
  }
}

async function verifyHttpIsolation(receipts) {
  const ports = { verifier: 4273, wallet: 4274, showcase: 4275 }
  const servers = []
  const checks = []
  try {
    for (const role of roles) {
      servers.push(await startRoleServer(role, ports[role]))
    }

    const routeMatrix = {
      wallet: { allowed: [['/', 302], ['/wallet', 200]], forbidden: ['/fellowship', '/evidence'] },
      verifier: { allowed: [['/', 302], ['/fellowship', 200]], forbidden: ['/wallet', '/evidence'] },
      showcase: { allowed: [['/', 200], ['/evidence', 200]], forbidden: ['/wallet', '/fellowship'] },
    }
    for (const role of roles) {
      const origin = `http://127.0.0.1:${ports[role]}`
      for (const [path, expectedStatus] of routeMatrix[role].allowed) {
        await recordFetch(checks, role, path, origin + path, expectedStatus)
      }
      for (const path of routeMatrix[role].forbidden) {
        await recordFetch(checks, role, path, origin + path, 404)
      }
    }

    for (const owner of receipts) {
      const assetPath = `/${owner.entryFile}`
      await recordFetch(checks, owner.role, assetPath, `http://127.0.0.1:${ports[owner.role]}${assetPath}`, 200)
      for (const peer of roles.filter((role) => role !== owner.role)) {
        await recordFetch(checks, peer, assetPath, `http://127.0.0.1:${ports[peer]}${assetPath}`, 404)
      }
    }
  } finally {
    await Promise.all(servers.map((server) => new Promise((done) => server.close(done))))
  }
  return checks
}

async function recordFetch(checks, role, path, url, expectedStatus) {
  const response = await fetch(url, { redirect: 'manual' })
  checks.push({ role, path, expectedStatus, actualStatus: response.status, passed: response.status === expectedStatus })
  if (response.status !== expectedStatus) {
    failures.push(`${role} returned ${response.status} for ${path}; expected ${expectedStatus}`)
  }
}

function startRoleServer(role, port) {
  const directory = resolve(root, 'dist-roles', role)
  const primaryRoute = primaryRoutes[role]
  const htmlRoutes = role === 'showcase' ? new Set(['/', '/evidence']) : new Set([primaryRoute])
  const server = createServer(async (request, response) => {
    const path = new URL(request.url ?? '/', `http://127.0.0.1:${port}`).pathname
    if (path === '/' && role !== 'showcase') {
      response.writeHead(302, { location: primaryRoute })
      response.end()
      return
    }
    if (htmlRoutes.has(path)) {
      const body = await readFile(resolve(directory, 'index.html'))
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      response.end(body)
      return
    }
    if (path.startsWith('/assets/')) {
      const filePath = resolve(directory, `.${path}`)
      if (!filePath.startsWith(resolve(directory, 'assets'))) {
        response.writeHead(404)
        response.end()
        return
      }
      try {
        const body = await readFile(filePath)
        response.writeHead(200, { 'content-type': path.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/css; charset=utf-8' })
        response.end(body)
      } catch {
        response.writeHead(404)
        response.end()
      }
      return
    }
    response.writeHead(404)
    response.end()
  })
  return new Promise((done, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => done(server))
  })
}
