import type { AoPushRow } from '@/types/sheets'
import { normalizeDate } from './formatters'

const AO_SHEET_NAME = '브레이즈 푸시 실적'

// /api/sheets 프록시를 통해 시트 데이터를 가져옴 — 서버 측 env var로 인증하므로 클라이언트는 헤더 불필요
async function fetchSheet(sheetName: string): Promise<string[][]> {
  const res = await fetch(`/api/sheets?sheet=${encodeURIComponent(sheetName)}`)
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

export async function fetchAoPushRows(): Promise<AoPushRow[]> {
  const raw = await fetchSheet(AO_SHEET_NAME)
  if (raw.length < 2) return []
  return raw.slice(1).map(normalizeAoPushRow).sort((a, b) => a.date.localeCompare(b.date))
}
