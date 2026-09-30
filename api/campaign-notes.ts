import type { VercelRequest, VercelResponse } from '@vercel/node'
import { JWT } from 'google-auth-library'

const SHEET_NAME = '캠페인_메모'
const RANGE = `${SHEET_NAME}!A:B`
const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const SPREADSHEET_ID_PATTERN = /^[A-Za-z0-9_-]+$/

function getAuthClient(): JWT | null {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
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
    if (campaign && !Object.hasOwn(notes, campaign)) {
      notes[campaign] = rows[i]?.[1] ?? ''
    }
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = getAuthClient()

  if (req.method === 'GET') {
    const { spreadsheetId: qsSpreadsheetId } = req.query as Record<string, string>
    const spreadsheetId = qsSpreadsheetId || process.env.SPREADSHEET_ID
    if (!auth || !spreadsheetId || !SPREADSHEET_ID_PATTERN.test(spreadsheetId)) {
      console.error('[campaign-notes] GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY or spreadsheetId not configured')
      return res.status(200).json({})
    }
    try {
      const token = await getAccessToken(auth)
      const rows = await readRows(spreadsheetId, token)
      res.setHeader('Cache-Control', 'private, no-store')
      return res.status(200).json(notesFromRows(rows))
    } catch (err) {
      console.error('[campaign-notes] read failed', err)
      return res.status(200).json({})
    }
  }

  if (req.method === 'PUT') {
    const { spreadsheetId: bodySpreadsheetId, campaign, note } = (req.body ?? {}) as { spreadsheetId?: string; campaign?: string; note?: string }
    if (!campaign) {
      return res.status(400).json({ error: 'campaign이 필요합니다.' })
    }
    if (typeof campaign !== 'string' || campaign.length > 200) {
      return res.status(400).json({ error: 'campaign이 너무 깁니다 (최대 200자).' })
    }
    if (note !== undefined && (typeof note !== 'string' || note.length > 2000)) {
      return res.status(400).json({ error: 'note가 너무 깁니다 (최대 2000자).' })
    }
    const spreadsheetId = bodySpreadsheetId || process.env.SPREADSHEET_ID
    if (!auth || !spreadsheetId || !SPREADSHEET_ID_PATTERN.test(spreadsheetId)) {
      console.error('[campaign-notes] GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY or spreadsheetId not configured')
      return res.status(500).json({ error: '메모 저장 기능이 아직 설정되지 않았습니다.' })
    }
    try {
      const token = await getAccessToken(auth)
      await writeNote(spreadsheetId, token, campaign, note ?? '')
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error('[campaign-notes] write failed', err)
      return res.status(500).json({ error: '메모 저장에 실패했습니다.' })
    }
  }

  res.setHeader('Allow', 'GET, PUT')
  return res.status(405).json({ error: 'Method not allowed' })
}
