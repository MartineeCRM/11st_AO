import type { VercelRequest, VercelResponse } from '@vercel/node'
import { JWT } from 'google-auth-library'

const SHEET_NAME = '모니터링_대상'
const HEADER = '캠페인명_분할'
const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const SPREADSHEET_ID_PATTERN = /^[A-Za-z0-9_-]+$/
const MAX_CAMPAIGNS = 500
const MAX_NAME_LENGTH = 200

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

async function sheetsFetch(url: string, auth: JWT, init: RequestInit = {}): Promise<Response> {
  const { token } = await auth.getAccessToken()
  if (!token) throw new Error('Failed to obtain Google access token')
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } })
  if (!res.ok) throw new Error(`Sheets request failed: ${res.status} ${await res.text().catch(() => '')}`)
  return res
}

const valuesUrl = (spreadsheetId: string, range: string, suffix = '') =>
  `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(`${SHEET_NAME}!${range}`)}${suffix}`

async function readCampaigns(spreadsheetId: string, auth: JWT): Promise<string[]> {
  const res = await sheetsFetch(valuesUrl(spreadsheetId, 'A:A'), auth)
  const { values } = (await res.json()) as { values?: string[][] }
  return (values ?? []).slice(1).map(row => row[0]).filter(Boolean)
}

// 헤더 + 목록을 먼저 덮어쓰고, 이전 목록이 더 길었다면 남은 꼬리만 지운다 (중간에 빈 목록이 보이지 않도록)
// ponytail: 마지막 저장이 이김. 동시에 편집하면 먼저 저장한 쪽 변경이 덮어써짐 — 문제되면 행 단위 upsert로 전환
async function writeCampaigns(spreadsheetId: string, auth: JWT, campaigns: string[]): Promise<void> {
  await sheetsFetch(valuesUrl(spreadsheetId, 'A1', '?valueInputOption=RAW'), auth, {
    method: 'PUT',
    body: JSON.stringify({ values: [[HEADER], ...campaigns.map(c => [c])] }),
  })
  await sheetsFetch(valuesUrl(spreadsheetId, `A${campaigns.length + 2}:A`, ':clear'), auth, { method: 'POST', body: '{}' })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = getAuthClient()

  if (req.method === 'GET') {
    const { spreadsheetId: qsSpreadsheetId } = req.query as Record<string, string>
    const spreadsheetId = qsSpreadsheetId || process.env.SPREADSHEET_ID
    if (!auth || !spreadsheetId || !SPREADSHEET_ID_PATTERN.test(spreadsheetId)) {
      console.error('[monitored-campaigns] GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY or spreadsheetId not configured')
      return res.status(503).json({ error: '모니터링 대상 공유 기능이 아직 설정되지 않았습니다.' })
    }
    try {
      const campaigns = await readCampaigns(spreadsheetId, auth)
      res.setHeader('Cache-Control', 'private, no-store')
      return res.status(200).json({ campaigns })
    } catch (err) {
      console.error('[monitored-campaigns] read failed', err)
      return res.status(500).json({ error: `'${SHEET_NAME}' 탭을 읽지 못했습니다. 시트에 탭이 있고 서비스 계정에 공유돼 있는지 확인해주세요.` })
    }
  }

  if (req.method === 'PUT') {
    const { spreadsheetId: bodySpreadsheetId, campaigns } = (req.body ?? {}) as { spreadsheetId?: string; campaigns?: unknown }
    if (!Array.isArray(campaigns) || campaigns.length > MAX_CAMPAIGNS) {
      return res.status(400).json({ error: `campaigns는 최대 ${MAX_CAMPAIGNS}개의 배열이어야 합니다.` })
    }
    if (!campaigns.every(c => typeof c === 'string' && c.length > 0 && c.length <= MAX_NAME_LENGTH)) {
      return res.status(400).json({ error: `캠페인명은 1~${MAX_NAME_LENGTH}자 문자열이어야 합니다.` })
    }
    const spreadsheetId = bodySpreadsheetId || process.env.SPREADSHEET_ID
    if (!auth || !spreadsheetId || !SPREADSHEET_ID_PATTERN.test(spreadsheetId)) {
      console.error('[monitored-campaigns] GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY or spreadsheetId not configured')
      return res.status(503).json({ error: '모니터링 대상 공유 기능이 아직 설정되지 않았습니다.' })
    }
    try {
      await writeCampaigns(spreadsheetId, auth, campaigns as string[])
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error('[monitored-campaigns] write failed', err)
      return res.status(500).json({ error: '모니터링 대상 저장에 실패했습니다.' })
    }
  }

  res.setHeader('Allow', 'GET, PUT')
  return res.status(405).json({ error: 'Method not allowed' })
}
