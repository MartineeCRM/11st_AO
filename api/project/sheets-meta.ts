import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyProjectAccess } from '../_lib/auth.js'

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

// GET /api/project/sheets-meta?spreadsheet_id=xxx&google_api_key=xxx
// 스프레드시트의 시트 탭 목록 반환
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = await verifyProjectAccess(req as any, res as any)
  if (!auth) return

  const { spreadsheet_id, google_api_key } = req.query as Record<string, string>
  const sid = spreadsheet_id || auth.project.spreadsheet_id
  const key = google_api_key || auth.project.google_api_key

  if (!sid || !key) {
    return res.status(400).json({ error: 'spreadsheet_id와 google_api_key가 필요합니다.' })
  }

  const url = `${SHEETS_BASE}/${sid}?key=${key}&fields=sheets.properties`

  try {
    const upstream = await fetch(url)
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '')
      return res.status(502).json({ error: `Google Sheets 오류: ${upstream.status}`, detail: text })
    }
    const json = await upstream.json() as { sheets: { properties: { title: string; sheetId: number } }[] }
    const sheets = json.sheets?.map(s => ({ title: s.properties.title, sheetId: s.properties.sheetId })) ?? []
    return res.status(200).json({ sheets })
  } catch (err) {
    return res.status(503).json({ error: '스프레드시트에 연결할 수 없습니다.' })
  }
}
