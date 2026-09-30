import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { Redis } from '@upstash/redis'

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

function campaignNotesDevProxy(env: Record<string, string>): Plugin {
  const redisUrl = env.UPSTASH_REDIS_REST_URL
  const redisToken = env.UPSTASH_REDIS_REST_TOKEN
  const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken, automaticDeserialization: false }) : null

  function keyOf(spreadsheetId: string): string {
    return `notes:${spreadsheetId || 'default'}`
  }

  return {
    name: 'campaign-notes-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/campaign-notes', async (req, res) => {
        const incomingUrl = new URL(req.url ?? '/', 'http://localhost')

        if (req.method === 'GET') {
          const spreadsheetId = incomingUrl.searchParams.get('spreadsheetId') ?? ''
          res.setHeader('Content-Type', 'application/json')
          if (!redis) {
            console.error('[campaign-notes-dev-proxy] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not configured')
            res.end(JSON.stringify({}))
            return
          }
          try {
            const notes = await redis.hgetall(keyOf(spreadsheetId))
            res.end(JSON.stringify(notes ?? {}))
          } catch (error) {
            console.error('[campaign-notes-dev-proxy] read failed', error)
            res.end(JSON.stringify({}))
          }
          return
        }

        if (req.method === 'PUT') {
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          let body: { spreadsheetId?: string; campaign?: string; note?: string } = {}
          try {
            body = JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}')
          } catch {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: '잘못된 요청 본문입니다.' }))
            return
          }

          res.setHeader('Content-Type', 'application/json')
          if (!body.campaign) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'campaign이 필요합니다.' }))
            return
          }
          if (typeof body.campaign !== 'string' || body.campaign.length > 200) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'campaign이 너무 깁니다 (최대 200자).' }))
            return
          }
          if (body.note !== undefined && (typeof body.note !== 'string' || body.note.length > 2000)) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'note가 너무 깁니다 (최대 2000자).' }))
            return
          }
          if (!redis) {
            console.error('[campaign-notes-dev-proxy] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not configured')
            res.statusCode = 500
            res.end(JSON.stringify({ error: '메모 저장 기능이 아직 설정되지 않았습니다.' }))
            return
          }
          try {
            await redis.hset(keyOf(body.spreadsheetId ?? ''), { [body.campaign]: body.note ?? '' })
            res.end(JSON.stringify({ ok: true }))
          } catch (error) {
            console.error('[campaign-notes-dev-proxy] write failed', error)
            res.statusCode = 500
            res.end(JSON.stringify({ error: '메모 저장에 실패했습니다.' }))
          }
          return
        }

        res.statusCode = 405
        res.end()
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss(), sheetsDevProxy(env), campaignNotesDevProxy(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
