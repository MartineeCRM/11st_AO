import type { MartineeUnionRow, DailyKpiRow } from '@/types/sheets'

const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID as string
const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY as string
const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets'

async function fetchSheet(sheetName: string): Promise<string[][]> {
  const url = `${BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}?key=${API_KEY}`
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google Sheets API 오류 [${sheetName}]: ${res.status} ${text}`)
  }
  const json = (await res.json()) as { values?: string[][] }
  return json.values ?? []
}

function parseRows<T>(raw: string[][]): T[] {
  if (raw.length < 2) return []
  const headers = raw[0].map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  return raw.slice(1).map(row => {
    const obj: Record<string, string | number> = {}
    headers.forEach((h, i) => {
      const cell = row[i] ?? ''
      const stripped = cell.replace(/,/g, '')
      // 순수 숫자 형식만 number로 변환. "2024-03-15" 같은 날짜 문자열은 string 유지
      const num = /^\s*-?\d+\.?\d*\s*$/.test(stripped) ? parseFloat(stripped) : NaN
      obj[h] = isNaN(num) ? cell : num
    })
    return obj as T
  })
}

import { normalizeDate } from './formatters'

function normalizeMartinee(rows: Record<string, string | number>[]): MartineeUnionRow[] {
  return rows.map(r => ({
    date: normalizeDate(String(r['date'] ?? r['날짜'] ?? '')),
    campaign_id: String(r['campaign_id'] ?? r['id'] ?? ''),
    campaign_name: String(r['campaign_name'] ?? r['name'] ?? r['campaign'] ?? ''),
    canvas_name: String(r['canvas_name'] ?? r['canvas'] ?? ''),
    campaign_depth_1: String(r['campaign_depth_1'] ?? ''),
    variant_depth_1: String(r['variant_depth_1'] ?? r['variant'] ?? ''),
    os: String(r['os'] ?? ''),
    sent: Number(r['sent'] ?? 0),
    impression: Number(r['impression'] ?? r['impressions'] ?? 0),
    total_opens: Number(r['total_opens'] ?? r['opens'] ?? 0),
    first_button_clicks: Number(r['first_button_clicks'] ?? 0),
    second_button_clicks: Number(r['second_button_clicks'] ?? 0),
    body_clicks: Number(r['body_clicks'] ?? 0),
    conversion_a: Number(r['conversion_a'] ?? r['conversions'] ?? 0),
    revenue: Number(r['revenue'] ?? 0),
    unique_recipient: Number(r['unique_recipient'] ?? r['unique_recipients'] ?? 0),
  }))
}

function normalizeDailyKpi(rows: Record<string, string | number>[]): DailyKpiRow[] {
  return rows.map(r => ({
    date: normalizeDate(String(r['date'] ?? r['날짜'] ?? '')),
    push_opt_in: Number(r['push_opt_in'] ?? 0),
    sms_opt_in: Number(r['sms_opt_in'] ?? 0),
    kakao_opt_in: Number(r['kakao_opt_in'] ?? 0),
    dau: Number(r['dau'] ?? 0),
    mau: Number(r['mau'] ?? 0),
    revenue: Number(r['revenue'] ?? 0),
    aov: Number(r['aov'] ?? 0),
    arpu: Number(r['arpu'] ?? 0),
    arppu: Number(r['arppu'] ?? 0),
    purchase_cnt: Number(r['purchase_cnt'] ?? 0),
    complete_order_product: Number(r['complete_order_product'] ?? 0),
    first_purchase: Number(r['first_purchase'] ?? 0),
    like_brand: Number(r['like_brand'] ?? 0),
    like_product: Number(r['like_product'] ?? 0),
    view_cartpage: Number(r['view_cartpage'] ?? 0),
    view_product_detail: Number(r['view_product_detail'] ?? 0),
    view_promotion_list_page: Number(r['view_promotion_list_page'] ?? 0),
  }))
}

export async function fetchMartineeUnion(): Promise<MartineeUnionRow[]> {
  const raw = await fetchSheet('martinee_union')
  const parsed = parseRows<Record<string, string | number>>(raw)
  return normalizeMartinee(parsed)
}

export async function fetchDailyKpi(): Promise<DailyKpiRow[]> {
  const raw = await fetchSheet('daily_kpi')
  const parsed = parseRows<Record<string, string | number>>(raw)
  return normalizeDailyKpi(parsed)
}
