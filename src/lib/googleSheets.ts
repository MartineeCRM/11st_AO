import type { AoPushRow } from '@/types/sheets'
import type { SheetConnection } from '@/hooks/useSheetConnectionState'
import { normalizeDate } from './formatters'

const DEFAULT_SHEET_NAME = '브레이즈 푸시 실적'

const EXPECTED_HEADER = ['일자', '캠페인명', '캠페인명_분할', '배리언트명_분할', 'XSITE', '수신', '오픈', '오픈율',
  '결제건수', '결제회원수', '구매전환율', '즉차거래액', '결제순매출액', '분류', '월 구분']

/**
 * /api/sheets 프록시를 통해 시트 데이터를 가져옴.
 * connection이 비어 있으면(사용자가 설정 탭에서 아직 연결 정보를 입력하지 않은 경우)
 * 스프레드시트ID/시트명은 생략하고 API 키 헤더도 보내지 않는다 — 서버가 자체 기본값
 * (env var로 설정된 SPREADSHEET_ID/GOOGLE_SHEETS_API_KEY)으로 대체 처리한다.
 */
async function fetchSheet(connection: SheetConnection): Promise<string[][]> {
  const sheetName = connection.sheetName || DEFAULT_SHEET_NAME
  const params = new URLSearchParams({ sheet: sheetName })
  if (connection.spreadsheetId) params.set('spreadsheetId', connection.spreadsheetId)

  const headers: Record<string, string> = {}
  if (connection.apiKey) headers['x-sheets-api-key'] = connection.apiKey

  const res = await fetch(`/api/sheets?${params.toString()}`, { headers })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(`Google Sheets API 오류 [${sheetName}]: ${res.status} ${json.error ?? ''}`)
  }
  const json = (await res.json()) as { values?: string[][] }
  return json.values ?? []
}

function parseNumber(cell: string | undefined): number {
  if (!cell) return 0
  const stripped = cell.replace(/,/g, '').trim()
  const n = parseFloat(stripped)
  return Number.isNaN(n) ? 0 : n
}

function parsePercent(cell: string | undefined): number {
  if (!cell) return 0
  const stripped = cell.replace(/,/g, '').replace(/%/g, '').trim()
  const n = parseFloat(stripped)
  return Number.isNaN(n) ? 0 : n / 100
}

/**
 * 열 순서 고정: 일자, 캠페인명, 캠페인명_분할, 배리언트명_분할, XSITE, 수신, 오픈, 오픈율,
 * 결제건수, 결제회원수, 구매전환율, 즉차거래액, 결제순매출액, 분류, 월 구분
 */
function normalizeAoPushRow(row: string[]): AoPushRow {
  return {
    date: normalizeDate(row[0] ?? ''),
    campaignName: row[1] ?? '',
    campaignSplit: row[2] ?? '',
    variantSplit: row[3] ?? '',
    xsite: row[4] ?? '',
    sent: parseNumber(row[5]),
    opens: parseNumber(row[6]),
    openRate: parsePercent(row[7]),
    paymentCount: parseNumber(row[8]),
    payingMembers: parseNumber(row[9]),
    conversionRate: parsePercent(row[10]),
    grossAmount: parseNumber(row[11]),
    netRevenue: parseNumber(row[12]),
    category: row[13] ?? '',
    monthLabel: row[14] ?? '',
  }
}

export async function fetchAoPushRows(connection: SheetConnection): Promise<AoPushRow[]> {
  const raw = await fetchSheet(connection)
  if (raw.length < 2) return []

  const header = raw[0].map(h => (h ?? '').trim())
  const mismatch = EXPECTED_HEADER.findIndex((h, i) => header[i] !== h)
  if (mismatch !== -1) {
    throw new Error(`시트 열 구성이 변경되었습니다 (${mismatch + 1}번째 열: "${header[mismatch] ?? ''}" ≠ "${EXPECTED_HEADER[mismatch]}"). 관리자에게 문의하세요.`)
  }

  return raw.slice(1).map(normalizeAoPushRow).sort((a, b) => a.date.localeCompare(b.date))
}
