import type { VercelRequest, VercelResponse } from '@vercel/node'

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const DEFAULT_SHEET_NAME = '브레이즈 푸시 실적'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 클라이언트(설정 탭에서 사용자가 입력한 값)가 우선, 없으면 서버 기본 연결(env var)로 대체.
  // 이렇게 하면 여러 고객사가 각자 자기 스프레드시트/API 키를 브라우저에만 저장해 쓸 수 있고,
  // 아무 설정도 안 한 사용자는 배포자가 지정한 기본 연결을 그대로 사용하게 된다.
  const { sheet, spreadsheetId: qsSpreadsheetId } = req.query as Record<string, string>
  const spreadsheetId = qsSpreadsheetId || process.env.SPREADSHEET_ID
  const apiKey = (req.headers['x-sheets-api-key'] as string | undefined) || process.env.GOOGLE_SHEETS_API_KEY
  if (!spreadsheetId || !apiKey) {
    console.error('[sheets] no SPREADSHEET_ID/GOOGLE_SHEETS_API_KEY from client or server env')
    return res.status(500).json({ error: '스프레드시트 연결 정보가 없습니다. 설정 탭에서 연결 정보를 입력해주세요.' })
  }

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
