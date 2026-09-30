import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { JWT } from 'google-auth-library'

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
  const SHEET_NAME = '캠페인_메모'
  const RANGE = `${SHEET_NAME}!A:B`
  const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

  function getAuthClient(): JWT | null {
    const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    const rawKey = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    if (!email || !rawKey) return null
    return new JWT({
      email,
      key: rawKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
  }

  async function getAccessToken(auth: JWT): Promise<string> {
    const { token } = await auth.getAccessToken()
    if (!token) throw new Error('Failed to obtain Google access token')
    return token
  }

  async function readRows(spreadsheetId: string, token: string): Promise<string[][]> {
    const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(RANGE)}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Sheets read failed: ${res.status} ${text}`)
    }
    const json = (await res.json()) as { values?: string[][] }
    return json.values ?? []
  }

  function notesFromRows(rows: string[][]): Record<string, string> {
    const notes: Record<string, string> = {}
    for (let i = 1; i < rows.length; i++) {
      const campaign = rows[i]?.[0]
      if (campaign) notes[campaign] = rows[i]?.[1] ?? ''
    }
    return notes
  }

  async function writeNote(spreadsheetId: string, token: string, campaign: string, note: string): Promise<void> {
    const rows = await readRows(spreadsheetId, token)
    const matchIndex = rows.findIndex((row, i) => i > 0 && row[0] === campaign)

    if (matchIndex > 0) {
      const range = `${SHEET_NAME}!B${matchIndex + 1}`
      const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`
      const res = await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [[note]] }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Sheets update failed: ${res.status} ${text}`)
      }
    } else {
      const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(RANGE)}:append?valueInputOption=RAW`
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [[campaign, note]] }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Sheets append failed: ${res.status} ${text}`)
      }
    }
  }

  return {
    name: 'campaign-notes-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/campaign-notes', async (req, res) => {
        const incomingUrl = new URL(req.url ?? '/', 'http://localhost')
        const auth = getAuthClient()

        if (req.method === 'GET') {
          const spreadsheetId = incomingUrl.searchParams.get('spreadsheetId') || env.SPREADSHEET_ID || ''
          res.setHeader('Content-Type', 'application/json')
          if (!auth || !spreadsheetId) {
            console.error('[campaign-notes-dev-proxy] GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY or spreadsheetId not configured')
            res.end(JSON.stringify({}))
            return
          }
          try {
            const token = await getAccessToken(auth)
            const rows = await readRows(spreadsheetId, token)
            res.end(JSON.stringify(notesFromRows(rows)))
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
          const spreadsheetId = body.spreadsheetId || env.SPREADSHEET_ID || ''
          if (!auth || !spreadsheetId) {
            console.error('[campaign-notes-dev-proxy] GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY or spreadsheetId not configured')
            res.statusCode = 500
            res.end(JSON.stringify({ error: '메모 저장 기능이 아직 설정되지 않았습니다.' }))
            return
          }
          try {
            const token = await getAccessToken(auth)
            await writeNote(spreadsheetId, token, body.campaign, body.note ?? '')
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
