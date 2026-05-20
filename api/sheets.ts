import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyProjectAccess } from './_lib/auth.js'

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = await verifyProjectAccess(req as any, res as any)
  if (!auth) return // verifyProjectAccess already sent the error response

  const { sheet, range } = req.query as Record<string, string>
  if (!sheet) {
    return res.status(400).json({ error: 'Missing sheet parameter' })
  }

  const { spreadsheet_id, google_api_key } = auth.project
  const rangeParam = range ? `${sheet}!${range}` : `${sheet}!A:ZZ`
  const url = `${SHEETS_BASE}/${spreadsheet_id}/values/${encodeURIComponent(rangeParam)}?key=${google_api_key}`

  try {
    const upstream = await fetch(url)
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '')
      console.error('[sheets] upstream error', upstream.status, text)
      return res.status(502).json({ error: `Google Sheets error: ${upstream.status}` })
    }
    const json = await upstream.json()

    // private: 프로젝트별 인증 응답이므로 CDN 공유 캐시 금지
    res.setHeader('Cache-Control', 'private, max-age=300')
    return res.status(200).json(json)
  } catch (err) {
    console.error('[sheets] fetch failed', err)
    return res.status(503).json({ error: 'Failed to reach Google Sheets API' })
  }
}
