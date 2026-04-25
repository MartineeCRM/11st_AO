import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const ALLOWED_BRAZE_PATHS = new Set([
  '/campaigns/list',
  '/campaigns/details',
  '/campaigns/data_series',
])

function brazeDevProxy(env: Record<string, string>): Plugin {
  const endpoint = (env.BRAZE_REST_ENDPOINT || env.VITE_BRAZE_REST_ENDPOINT || '').replace(/\/+$/, '')
  const apiKey = env.BRAZE_API_KEY || env.VITE_BRAZE_API_KEY || ''

  return {
    name: 'braze-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/braze', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ message: 'Method not allowed' }))
          return
        }

        const incomingUrl = new URL(req.url ?? '/', 'http://localhost')
        const proxyPath = incomingUrl.pathname
        if (!ALLOWED_BRAZE_PATHS.has(proxyPath)) {
          res.statusCode = 404
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ message: 'Unsupported Braze endpoint' }))
          return
        }

        if (!endpoint || !apiKey) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ message: 'Braze server environment variables are not configured' }))
          return
        }

        const brazeUrl = new URL(proxyPath, `${endpoint}/`)
        incomingUrl.searchParams.forEach((value, key) => {
          brazeUrl.searchParams.append(key, value)
        })

        try {
          const brazeResponse = await fetch(brazeUrl, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          })
          const text = await brazeResponse.text()

          res.statusCode = brazeResponse.status
          res.setHeader('Content-Type', brazeResponse.headers.get('content-type') ?? 'application/json')
          res.end(text)
        } catch (error) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            message: error instanceof Error ? error.message : 'Braze proxy request failed',
          }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss(), brazeDevProxy(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
