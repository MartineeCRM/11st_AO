import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const DEFAULT_SHEET_NAME = '브레이즈 푸시 실적'
const ALLOWED_SHEETS = new Set([DEFAULT_SHEET_NAME])

function sheetsDevProxy(env: Record<string, string>): Plugin {
  return {
    name: 'sheets-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/sheets', async (req, res) => {
        const spreadsheetId = env.SPREADSHEET_ID || ''
        const apiKey = env.GOOGLE_SHEETS_API_KEY || ''

        if (!spreadsheetId || !apiKey) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: '.env에 SPREADSHEET_ID와 GOOGLE_SHEETS_API_KEY를 확인하세요.' }))
          return
        }

        const incomingUrl = new URL(req.url ?? '/', 'http://localhost')
        const requestedSheet = incomingUrl.searchParams.get('sheet')
        const sheet = requestedSheet && ALLOWED_SHEETS.has(requestedSheet) ? requestedSheet : DEFAULT_SHEET_NAME
        const range = `${sheet}!A:O`
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`

        try {
          const upstream = await fetch(url)
          const text = await upstream.text()
          res.statusCode = upstream.status
          res.setHeader('Content-Type', 'application/json')
          res.end(text)
        } catch (error) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Sheets proxy failed' }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss(), sheetsDevProxy(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
