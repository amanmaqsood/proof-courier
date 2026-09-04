import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { resolve } from 'node:path'

export const roleNames = ['wallet', 'verifier', 'showcase']
export const rolePrimaryRoutes = { wallet: '/wallet', verifier: '/fellowship', showcase: '/' }

const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
}

export function startRoleArtifactServer({ root, role, port }) {
  if (!roleNames.includes(role)) throw new Error(`Unknown Proof Courier role: ${role}`)

  const directory = resolve(root, 'dist-roles', role)
  const assetsDirectory = resolve(directory, 'assets')
  const primaryRoute = rolePrimaryRoutes[role]
  const htmlRoutes = role === 'showcase' ? new Set(['/', '/evidence']) : new Set([primaryRoute])
  const server = createServer(async (request, response) => {
    try {
      const path = new URL(request.url ?? '/', `http://127.0.0.1:${port}`).pathname
      if (path === '/' && role !== 'showcase') {
        response.writeHead(302, { ...securityHeaders, location: primaryRoute })
        response.end()
        return
      }
      if (htmlRoutes.has(path)) {
        const body = await readFile(resolve(directory, 'index.html'))
        response.writeHead(200, { ...securityHeaders, 'content-type': 'text/html; charset=utf-8' })
        response.end(body)
        return
      }
      if (path.startsWith('/assets/')) {
        const filePath = resolve(assetsDirectory, path.slice('/assets/'.length))
        if (!filePath.startsWith(`${assetsDirectory}/`)) {
          respondNotFound(response)
          return
        }
        try {
          const body = await readFile(filePath)
          response.writeHead(200, {
            ...securityHeaders,
            'content-type': path.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/css; charset=utf-8',
          })
          response.end(body)
        } catch {
          respondNotFound(response)
        }
        return
      }
      respondNotFound(response)
    } catch {
      response.writeHead(500, securityHeaders)
      response.end()
    }
  })

  return new Promise((done, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => done(server))
  })
}

function respondNotFound(response) {
  response.writeHead(404, { ...securityHeaders, 'content-type': 'text/plain; charset=utf-8' })
  response.end('Not found')
}
