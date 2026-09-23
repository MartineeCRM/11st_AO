import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const DEFAULT_SHEET_NAME = '브레이즈 푸시 실적'

function sheetsDevProxy(env: Record<string, string>): Plugin {
  return {
    name: 'sheets-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/sheets', async (req, res) => {
        const incomingUrl = new URL(req.url ?? '/', 'http://localhost')

        // 클라이언트(설정 탭 입력값) 우선, 없으면 로컬 .env 기본값으로 대체 — api/sheets.ts와 동일한 규칙
        const spreadsheetId = incomingUrl.searchParams.get('spreadsheetId') || env.SPREADSHEET_ID || ''
        const apiKeyHeader = req.headers['x-sheets-api-key']
        const apiKey = (typeof apiKeyHeader === 'string' ? apiKeyHeader : '') || env.GOOGLE_SHEETS_API_KEY || ''

        if (!spreadsheetId || !apiKey) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: '스프레드시트 연결 정보가 없습니다. 설정 탭에서 연결 정보를 입력해주세요.' }))
          return
        }

        const sheet = incomingUrl.searchParams.get('sheet') || DEFAULT_SHEET_NAME
        const range = `${sheet}!A:O`
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`

        try {
          const upstream = await fetch(url)
          if (!upstream.ok) {
            const text = await upstream.text().catch(() => '')
            console.error('[sheets-dev-proxy] upstream error', upstream.status, text)
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: `Google Sheets error: ${upstream.status}` }))
            return
          }
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
