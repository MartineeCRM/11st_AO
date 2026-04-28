import type { MartineeUnionRow, DailyKpiRow, AttDataRow } from '@/types/sheets'
import { normalizeDate } from './formatters'

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

function normalizeMartinee(rows: Record<string, string | number>[]): MartineeUnionRow[] {
  return rows
    .map(r => ({
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
    .sort((a, b) => a.date.localeCompare(b.date))
}

function normalizeDailyKpi(rows: Record<string, string | number>[]): DailyKpiRow[] {
  return rows
    .map(r => ({
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
    .sort((a, b) => a.date.localeCompare(b.date))
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

function normalizeAttData(rows: Record<string, string | number>[]): AttDataRow[] {
  return rows
    .map(r => ({
      date: normalizeDate(String(r['kst_date'] ?? r['date'] ?? '')),
      source_id: String(r['source_id'] ?? ''),
      source_type: String(r['source_type'] ?? ''),
      message_variation_id: String(r['message_variation_id'] ?? ''),
      message_type: String(r['message_type'] ?? ''),
      os: String(r['os'] ?? ''),
      source_alias: String(r['source_alias'] ?? ''),
      variant_alias: String(r['variant_alias'] ?? ''),
      category: String(r['분류'] ?? r['category'] ?? ''),
      impression_or_send_user: Number(r['impression_or_send_user'] ?? 0),
      open_or_click_user: Number(r['open_or_click_user'] ?? 0),
      purchase_item_count_6h: Number(r['purchase_item_count_6h'] ?? 0),
      purchase_count_6h: Number(r['purchase_count_6h'] ?? 0),
      purchase_user_count_6h: Number(r['purchase_user_count_6h'] ?? 0),
      purchase_amount_6h: Number(r['purchase_amount_6h'] ?? 0),
      join_membership: Number(r['join_membership'] ?? 0),
      add_to_cart: Number(r['add_to_cart'] ?? 0),
      pdp_view: Number(r['pdp_view'] ?? 0),
      exhibition_view: Number(r['exhibition_view'] ?? 0),
      push_subscribe: Number(r['push_subscribe'] ?? 0),
      coupon_used: Number(r['coupon_used'] ?? 0),
      promo_event_complete: Number(r['promo_event_complete'] ?? 0),
      promo_page_view: Number(r['promo_page_view'] ?? 0),
      plus_subscribe_start: Number(r['11plus_subscribe_start'] ?? 0),
      family_member_join: Number(r['family_member_join'] ?? 0),
      family_order_complete: Number(r['family_order_complete'] ?? 0),
      family_order_request: Number(r['family_order_request'] ?? 0),
      family_order_request_received: Number(r['family_order_request_received'] ?? 0),
      lotto_issued: Number(r['11lotto_issued'] ?? 0),
      lotto_my_page_view: Number(r['11lotto_my_page_view'] ?? 0),
      lotto_attendance_check: Number(r['11lotto_attendance_check'] ?? 0),
      noti_setting_view: Number(r['noti_setting_view'] ?? 0),
      my_11st_view: Number(r['my_11st_view'] ?? 0),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function fetchAttData(): Promise<AttDataRow[]> {
  const raw = await fetchSheet('ATT_DATA')
  const parsed = parseRows<Record<string, string | number>>(raw)
  return normalizeAttData(parsed)
}
