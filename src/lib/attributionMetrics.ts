import type { AttDataRow } from '@/types/sheets'

// ────────────────────────────────────────────────────────────
// 집계
// ────────────────────────────────────────────────────────────

export interface AttSums {
  impression_or_send_user: number
  open_or_click_user: number
  purchase_item_count_6h: number
  purchase_count_6h: number
  purchase_user_count_6h: number
  purchase_amount_6h: number
  join_membership: number
  add_to_cart: number
  pdp_view: number
  exhibition_view: number
  push_subscribe: number
  coupon_used: number
  promo_event_complete: number
  promo_page_view: number
  plus_subscribe_start: number
  family_member_join: number
  family_order_complete: number
  family_order_request: number
  family_order_request_received: number
  lotto_issued: number
  lotto_my_page_view: number
  lotto_attendance_check: number
  noti_setting_view: number
  my_11st_view: number
}

export function sumRows(rows: AttDataRow[]): AttSums {
  const s: AttSums = {
    impression_or_send_user: 0,
    open_or_click_user: 0,
    purchase_item_count_6h: 0,
    purchase_count_6h: 0,
    purchase_user_count_6h: 0,
    purchase_amount_6h: 0,
    join_membership: 0,
    add_to_cart: 0,
    pdp_view: 0,
    exhibition_view: 0,
    push_subscribe: 0,
    coupon_used: 0,
    promo_event_complete: 0,
    promo_page_view: 0,
    plus_subscribe_start: 0,
    family_member_join: 0,
    family_order_complete: 0,
    family_order_request: 0,
    family_order_request_received: 0,
    lotto_issued: 0,
    lotto_my_page_view: 0,
    lotto_attendance_check: 0,
    noti_setting_view: 0,
    my_11st_view: 0,
  }
  for (const r of rows) {
    s.impression_or_send_user += r.impression_or_send_user
    s.open_or_click_user += r.open_or_click_user
    s.purchase_item_count_6h += r.purchase_item_count_6h
    s.purchase_count_6h += r.purchase_count_6h
    s.purchase_user_count_6h += r.purchase_user_count_6h
    s.purchase_amount_6h += r.purchase_amount_6h
    s.join_membership += r.join_membership
    s.add_to_cart += r.add_to_cart
    s.pdp_view += r.pdp_view
    s.exhibition_view += r.exhibition_view
    s.push_subscribe += r.push_subscribe
    s.coupon_used += r.coupon_used
    s.promo_event_complete += r.promo_event_complete
    s.promo_page_view += r.promo_page_view
    s.plus_subscribe_start += r.plus_subscribe_start
    s.family_member_join += r.family_member_join
    s.family_order_complete += r.family_order_complete
    s.family_order_request += r.family_order_request
    s.family_order_request_received += r.family_order_request_received
    s.lotto_issued += r.lotto_issued
    s.lotto_my_page_view += r.lotto_my_page_view
    s.lotto_attendance_check += r.lotto_attendance_check
    s.noti_setting_view += r.noti_setting_view
    s.my_11st_view += r.my_11st_view
  }
  return s
}

// ────────────────────────────────────────────────────────────
// 구매 지표 계산
// ────────────────────────────────────────────────────────────

export interface PurchaseMetrics {
  user_cvr: number        // PURCHASE_USER_COUNT_6H / IMPRESSION_OR_SEND_USER
  count_cvr: number       // PURCHASE_COUNT_6H / IMPRESSION_OR_SEND_USER
  purchase_count: number  // PURCHASE_COUNT_6H
  revenue: number         // PURCHASE_AMOUNT_6H
  aov: number             // PURCHASE_AMOUNT_6H / PURCHASE_COUNT_6H
  arppu: number           // PURCHASE_AMOUNT_6H / PURCHASE_USER_COUNT_6H
  frequency: number       // PURCHASE_COUNT_6H / PURCHASE_USER_COUNT_6H
  items_per_order: number // PURCHASE_ITEM_COUNT_6H / PURCHASE_COUNT_6H
  items_per_user: number  // PURCHASE_ITEM_COUNT_6H / PURCHASE_USER_COUNT_6H
}

function safeDivide(a: number, b: number): number {
  return b === 0 ? 0 : a / b
}

export function calcPurchaseMetrics(s: AttSums): PurchaseMetrics {
  return {
    user_cvr: safeDivide(s.purchase_user_count_6h, s.impression_or_send_user),
    count_cvr: safeDivide(s.purchase_count_6h, s.impression_or_send_user),
    purchase_count: s.purchase_count_6h,
    revenue: s.purchase_amount_6h,
    aov: safeDivide(s.purchase_amount_6h, s.purchase_count_6h),
    arppu: safeDivide(s.purchase_amount_6h, s.purchase_user_count_6h),
    frequency: safeDivide(s.purchase_count_6h, s.purchase_user_count_6h),
    items_per_order: safeDivide(s.purchase_item_count_6h, s.purchase_count_6h),
    items_per_user: safeDivide(s.purchase_item_count_6h, s.purchase_user_count_6h),
  }
}

// ────────────────────────────────────────────────────────────
// 이벤트 CVR 계산
// ────────────────────────────────────────────────────────────

export type EventKey = keyof Omit<AttSums,
  | 'impression_or_send_user'
  | 'open_or_click_user'
  | 'purchase_item_count_6h'
  | 'purchase_count_6h'
  | 'purchase_user_count_6h'
  | 'purchase_amount_6h'
>

export function calcEventCvr(s: AttSums, eventKey: EventKey): number {
  return safeDivide(s[eventKey], s.impression_or_send_user)
}

// ────────────────────────────────────────────────────────────
// WoW / MoM 델타
// ────────────────────────────────────────────────────────────

export interface PeriodDelta {
  wow: number | null  // null = 비교 데이터 없음
  mom: number | null
}

export function calcDelta(current: number, prior: number): number | null {
  if (prior === 0) return null
  return (current - prior) / prior
}

// ────────────────────────────────────────────────────────────
// 날짜 범위 오프셋 유틸
// ────────────────────────────────────────────────────────────

export function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// ────────────────────────────────────────────────────────────
// 트렌드 데이터 (날짜별 집계)
// ────────────────────────────────────────────────────────────

export type PurchaseMetricKey = keyof PurchaseMetrics

export interface TrendPoint {
  date: string
  value: number
  wow_value: number | null
  mom_value: number | null
}

export function buildTrendData(
  rows: AttDataRow[],
  metricKey: PurchaseMetricKey,
  startDate: string,
  endDate: string,
): TrendPoint[] {
  // 날짜별 그룹
  const byDate = new Map<string, AttDataRow[]>()
  for (const r of rows) {
    const list = byDate.get(r.date) ?? []
    list.push(r)
    byDate.set(r.date, list)
  }

  const points: TrendPoint[] = []
  const cur = new Date(startDate)
  const end = new Date(endDate)

  while (cur <= end) {
    const dateStr = cur.toISOString().slice(0, 10)
    const wowDate = offsetDate(dateStr, -7)
    const momDate = offsetDate(dateStr, -30)

    const curRows = byDate.get(dateStr) ?? []
    const wowRows = byDate.get(wowDate) ?? []
    const momRows = byDate.get(momDate) ?? []

    const curVal = calcPurchaseMetrics(sumRows(curRows))[metricKey]
    const wowVal = wowRows.length > 0 ? calcPurchaseMetrics(sumRows(wowRows))[metricKey] : null
    const momVal = momRows.length > 0 ? calcPurchaseMetrics(sumRows(momRows))[metricKey] : null

    points.push({ date: dateStr, value: curVal, wow_value: wowVal, mom_value: momVal })
    cur.setDate(cur.getDate() + 1)
  }

  return points
}

export interface EventTrendPoint {
  date: string
  value: number
}

export function buildEventTrendData(
  rows: AttDataRow[],
  eventKey: EventKey,
  startDate: string,
  endDate: string,
): EventTrendPoint[] {
  const byDate = new Map<string, AttDataRow[]>()
  for (const r of rows) {
    const list = byDate.get(r.date) ?? []
    list.push(r)
    byDate.set(r.date, list)
  }

  const points: EventTrendPoint[] = []
  const cur = new Date(startDate)
  const end = new Date(endDate)

  while (cur <= end) {
    const dateStr = cur.toISOString().slice(0, 10)
    const curRows = byDate.get(dateStr) ?? []
    const value = sumRows(curRows)[eventKey]
    points.push({ date: dateStr, value })
    cur.setDate(cur.getDate() + 1)
  }

  return points
}
