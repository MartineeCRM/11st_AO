import type { VercelRequest, VercelResponse } from '@vercel/node'

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const DEFAULT_SHEET_NAME = '브레이즈 푸시 실적'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const spreadsheetId = process.env.SPREADSHEET_ID
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY
  if (!spreadsheetId || !apiKey) {
    console.error('[sheets] missing SPREADSHEET_ID or GOOGLE_SHEETS_API_KEY env var')
    return res.status(500).json({ error: 'Server is missing SPREADSHEET_ID or GOOGLE_SHEETS_API_KEY' })
  }

  const { sheet } = req.query as Record<string, string>
  const sheetName = sheet || DEFAULT_SHEET_NAME
  const range = `${sheetName}!A:O`
  const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`

  try {
    const upstream = await fetch(url)
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '')
      console.error('[sheets] upstream error', upstream.status, text)
      return res.status(502).json({ error: `Google Sheets error: ${upstream.status}` })
    }
    const json = await upstream.json()

    // private: 응답에 스프레드시트 전체 범위 데이터가 포함되므로 CDN 공유 캐시 금지
    res.setHeader('Cache-Control', 'private, max-age=300')
    return res.status(200).json(json)
  } catch (err) {
    console.error('[sheets] fetch failed', err)
    return res.status(503).json({ error: 'Failed to reach Google Sheets API' })
  }
}
