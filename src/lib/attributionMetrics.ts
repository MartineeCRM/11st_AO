import type { AttDataRow } from '@/types/sheets'

// ────────────────────────────────────────────────────────────
// 집계
// ────────────────────────────────────────────────────────────

export interface AttSums {
  impression_or_send_user: number
  open_or_click_user: number
  purchase_user_count: number
  purchase_count: number
  purchase_item_count: number
  purchase_amount: number
  purchase_amount_6h: number
  extra_events: Record<string, number>
}

export function sumRows(rows: AttDataRow[]): AttSums {
  const s: AttSums = {
    impression_or_send_user: 0,
    open_or_click_user: 0,
    purchase_user_count: 0,
    purchase_count: 0,
    purchase_item_count: 0,
    purchase_amount: 0,
    purchase_amount_6h: 0,
    extra_events: {},
  }
  for (const r of rows) {
    s.impression_or_send_user += r.impression_or_send_user
    s.open_or_click_user += r.open_or_click_user
    s.purchase_user_count += r.purchase_user_count
    s.purchase_count += r.purchase_count
    s.purchase_item_count += r.purchase_item_count
    s.purchase_amount += r.purchase_amount
    s.purchase_amount_6h += r.purchase_amount_6h
    for (const [k, v] of Object.entries(r.extra_events)) {
      s.extra_events[k] = (s.extra_events[k] ?? 0) + v
    }
  }
  return s
}

// 데이터에 존재하는 이벤트 키 목록 추출 (0이 아닌 값 우선, 전체 유니온)
export function collectEventKeys(rows: AttDataRow[]): string[] {
  const keys = new Set<string>()
  for (const r of rows) {
    for (const k of Object.keys(r.extra_events)) {
      keys.add(k)
    }
  }
  return [...keys].sort()
}

// ────────────────────────────────────────────────────────────
// 구매 지표 계산
// ────────────────────────────────────────────────────────────

export interface PurchaseMetrics {
  user_cvr: number        // purchase_user_count / impression_or_send_user
  count_cvr: number       // purchase_count / impression_or_send_user
  purchase_count: number
  revenue: number         // purchase_amount
  aov: number             // purchase_amount / purchase_count
  arppu: number           // purchase_amount / purchase_user_count
  frequency: number       // purchase_count / purchase_user_count
  items_per_order: number // purchase_item_count / purchase_count
  items_per_user: number  // purchase_item_count / purchase_user_count
}

function safeDivide(a: number, b: number): number {
  return b === 0 ? 0 : a / b
}

export function calcPurchaseMetrics(s: AttSums): PurchaseMetrics {
  return {
    user_cvr: safeDivide(s.purchase_user_count, s.impression_or_send_user),
    count_cvr: safeDivide(s.purchase_count, s.impression_or_send_user),
    purchase_count: s.purchase_count,
    revenue: s.purchase_amount,
    aov: safeDivide(s.purchase_amount, s.purchase_count),
    arppu: safeDivide(s.purchase_amount, s.purchase_user_count),
    frequency: safeDivide(s.purchase_count, s.purchase_user_count),
    items_per_order: safeDivide(s.purchase_item_count, s.purchase_count),
    items_per_user: safeDivide(s.purchase_item_count, s.purchase_user_count),
  }
}

// ────────────────────────────────────────────────────────────
// 이벤트 CVR 계산
// ────────────────────────────────────────────────────────────

export type EventKey = string

export function calcEventCvr(s: AttSums, eventKey: EventKey): number {
  return safeDivide(s.extra_events[eventKey] ?? 0, s.impression_or_send_user)
}

export function getEventCount(s: AttSums, eventKey: EventKey): number {
  return s.extra_events[eventKey] ?? 0
}

// ────────────────────────────────────────────────────────────
// WoW / MoM 델타
// ────────────────────────────────────────────────────────────

export interface PeriodDelta {
  wow: number | null
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
    const value = sumRows(curRows).extra_events[eventKey] ?? 0
    points.push({ date: dateStr, value })
    cur.setDate(cur.getDate() + 1)
  }

  return points
}
