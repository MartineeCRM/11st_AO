import type { AoPushRow, DateRange } from '@/types/sheets'
import { addDays, formatDateShort, parseDateStr, toDateStr } from './formatters'

// ─── AO(Always-on) 캠페인 모니터링 ──────────────────────────────

/** 캠페인명이 'AO_'로 시작하는 행만 필터링 */
export function filterAoRows(rows: AoPushRow[]): AoPushRow[] {
  return rows.filter(r => r.campaignName.startsWith('AO_'))
}

/**
 * AO 캠페인 식별 키. 캠페인명_분할만 쓰면 서로 다른 배리언트가 같은 이름으로 뭉쳐 보이는
 * 경우가 있어, 배리언트명_분할이 있으면 붙여서 구분한다.
 */
function aoCampaignKey(r: AoPushRow): string {
  if (!r.campaignSplit) return ''
  return r.variantSplit ? `${r.campaignSplit} · ${r.variantSplit}` : r.campaignSplit
}

export interface AoCampaignSelection {
  campaign: string
  variant: string | null
}

function matchesSelection(r: AoPushRow, selection: AoCampaignSelection): boolean {
  if (r.campaignSplit !== selection.campaign) return false
  return selection.variant === null || r.variantSplit === selection.variant
}

/** AO 캠페인 목록 (캠페인명_분할 기준만, 베리언트 구분 없이), 가나다순 */
export function listAoCampaignGroups(rows: AoPushRow[]): string[] {
  const names = new Set<string>()
  for (const r of rows) {
    if (r.campaignSplit) names.add(r.campaignSplit)
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'ko'))
}

/** 주어진 캠페인(캠페인명_분할)에 속한 배리언트명_분할 목록(빈 값 제외), 가나다순 */
export function listAoCampaignVariants(rows: AoPushRow[], campaign: string): string[] {
  const names = new Set<string>()
  for (const r of rows) {
    if (r.campaignSplit === campaign && r.variantSplit) names.add(r.variantSplit)
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'ko'))
}

export interface AoTrendPoint {
  period: string
  sent: number
  paymentCount: number
  /** paymentCount ÷ sent */
  paymentRate: number
  /** 연관거래액 (즉차거래액) */
  grossAmount: number
}

/** 날짜 → 그 주(월요일 시작) 첫날, YYYY-MM-DD */
function weekStart(dateStr: string): string {
  const d = parseDateStr(dateStr)
  if (!d) return dateStr
  const day = d.getDay() // 0=일 .. 6=토
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  return toDateStr(monday)
}

/** 날짜 → 월 (YYYY-MM) */
function monthStart(dateStr: string): string {
  return dateStr.slice(0, 7)
}

/** 특정 AO 캠페인의 일/주/월 단위 합산 추이 */
export function buildAoCampaignTrend(
  rows: AoPushRow[],
  selection: AoCampaignSelection,
  granularity: 'day' | 'week' | 'month',
): AoTrendPoint[] {
  const campaignRows = rows.filter(r => matchesSelection(r, selection))
  const byPeriod = new Map<string, AoPushRow[]>()
  for (const r of campaignRows) {
    const key = granularity === 'day' ? r.date : granularity === 'week' ? weekStart(r.date) : monthStart(r.date)
    const list = byPeriod.get(key) ?? []
    list.push(r)
    byPeriod.set(key, list)
  }
  return [...byPeriod.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, rs]) => {
      const m = sumAoMetrics(rs)
      return {
        period: granularity === 'month' ? monthLabel(period) : formatDateShort(period),
        sent: m.sent,
        paymentCount: m.paymentCount,
        paymentRate: m.sent > 0 ? m.paymentCount / m.sent : 0,
        grossAmount: m.grossAmount,
      }
    })
}

export interface AoDailyRow {
  date: string
  sent: number
  opens: number
  /** opens ÷ sent */
  openRate: number
  paymentCount: number
  /** paymentCount ÷ sent */
  paymentRate: number
  payingMembers: number
  /** payingMembers ÷ sent */
  payingMemberRate: number
  /** 연관거래액 (즉차거래액) */
  grossAmount: number
}

/** 특정 AO 캠페인의 일자별 실적 — 최신 날짜가 먼저 */
export function buildAoCampaignDailyRows(rows: AoPushRow[], selection: AoCampaignSelection): AoDailyRow[] {
  const campaignRows = rows.filter(r => matchesSelection(r, selection))
  const byDate = new Map<string, AoPushRow[]>()
  for (const r of campaignRows) {
    const list = byDate.get(r.date) ?? []
    list.push(r)
    byDate.set(r.date, list)
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, rs]) => {
      const m = sumAoMetrics(rs)
      return {
        date,
        sent: m.sent,
        opens: m.opens,
        openRate: m.sent > 0 ? m.opens / m.sent : 0,
        paymentCount: m.paymentCount,
        paymentRate: m.sent > 0 ? m.paymentCount / m.sent : 0,
        payingMembers: m.payingMembers,
        payingMemberRate: m.sent > 0 ? m.payingMembers / m.sent : 0,
        grossAmount: m.grossAmount,
      }
    })
}

export interface AoMonthlyMetrics {
  sent: number
  opens: number
  paymentCount: number
  payingMembers: number
  /** 연관거래액 (즉차거래액) */
  grossAmount: number
}

export interface AoPivotRow {
  campaign: string
  /** YYYY-MM 단위 실적 (그 캠페인이 실제 발송한 달만 존재) */
  byMonth: Record<string, AoMonthlyMetrics>
  /** YYYY 단위 연간 합계 (연도가 접혔을 때 표시) */
  byYear: Record<string, AoMonthlyMetrics>
}

export interface AoPivotResult {
  /** 펼쳐진(요청된) 연도, 최신순 */
  years: string[]
  /** 연도별로 실제 데이터가 존재하는 월 목록 (그 연도 내림차순) */
  monthsByYear: Record<string, string[]>
  rows: AoPivotRow[]
}

function sumAoMetrics(rs: AoPushRow[]): AoMonthlyMetrics {
  return {
    sent: rs.reduce((s, r) => s + r.sent, 0),
    opens: rs.reduce((s, r) => s + r.opens, 0),
    paymentCount: rs.reduce((s, r) => s + r.paymentCount, 0),
    payingMembers: rs.reduce((s, r) => s + r.payingMembers, 0),
    grossAmount: rs.reduce((s, r) => s + r.grossAmount, 0),
  }
}

/** 날짜 → 연 (YYYY) */
function yearOf(dateStr: string): string {
  return dateStr.slice(0, 4)
}

/** AO 데이터에 존재하는 전체 연도 목록 (최신순) */
export function listAoYears(rows: AoPushRow[]): string[] {
  return [...new Set(rows.map(r => yearOf(r.date)))].sort().reverse()
}

/**
 * AO 캠페인 실적 피벗 (연도 단위로 펼침/접음 가능).
 * years에 포함된 해에 한 번이라도 발송한 캠페인만 행으로 포함하고,
 * 캠페인·월 조합에 실제 발송 데이터가 없으면 byMonth에 항목 자체를 만들지 않는다.
 */
export function buildAoPivot(rows: AoPushRow[], years: string[]): AoPivotResult {
  const yearSet = new Set(years)
  const relevantRows = rows.filter(r => yearSet.has(yearOf(r.date)))

  const monthsByYear: Record<string, string[]> = {}
  for (const year of years) {
    monthsByYear[year] = [...new Set(
      relevantRows.filter(r => yearOf(r.date) === year).map(r => monthStart(r.date)),
    )].sort().reverse()
  }

  const byCampaign = new Map<string, AoPushRow[]>()
  for (const r of relevantRows) {
    const key = aoCampaignKey(r)
    if (!key) continue
    const list = byCampaign.get(key) ?? []
    list.push(r)
    byCampaign.set(key, list)
  }

  const pivotRows: AoPivotRow[] = [...byCampaign.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'ko'))
    .map(([campaign, campaignRows]) => {
      const byMonth: Record<string, AoMonthlyMetrics> = {}
      const byYear: Record<string, AoMonthlyMetrics> = {}
      for (const year of years) {
        const yearRows = campaignRows.filter(r => yearOf(r.date) === year)
        if (yearRows.length === 0) continue
        byYear[year] = sumAoMetrics(yearRows)
        for (const month of monthsByYear[year]) {
          const monthRows = yearRows.filter(r => monthStart(r.date) === month)
          if (monthRows.length > 0) byMonth[month] = sumAoMetrics(monthRows)
        }
      }
      return { campaign, byMonth, byYear }
    })

  return { years, monthsByYear, rows: pivotRows }
}

/** "YYYY-MM" → "N월" */
export function monthLabel(yyyyMm: string): string {
  const m = Number(yyyyMm.slice(5, 7))
  return `${m}월`
}

/** 날짜 문자열의 연도만 n만큼 이동 (월/일은 그대로 유지) */
export function shiftYears(dateStr: string, n: number): string {
  if (!dateStr) return dateStr
  const year = Number(dateStr.slice(0, 4))
  return `${year + n}${dateStr.slice(4)}`
}

/** 전년 대비 증감률. 작년 값이 0/없으면 비교 불가로 null */
export function calcYoY(current: number, previous: number | undefined): number | null {
  if (!previous) return null
  return (current - previous) / previous
}

/** 두 기간(비교 대상) 간 증감률. previous가 0/없으면 비교 불가로 null */
export function calcPeriodDelta(current: number, previous: number): number | null {
  if (!previous) return null
  return (current - previous) / previous
}

/** start~end와 같은 길이의, 바로 직전 기간을 반환 (예: 9/1~9/15 → 8/17~8/31) */
export function previousPeriodOfSameLength(start: string, end: string): { start: string; end: string } {
  const s = parseDateStr(start)
  const e = parseDateStr(end)
  if (!s || !e) return { start: '', end: '' }
  const lengthDays = Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1
  const newEnd = addDays(start, -1)
  const newStart = addDays(newEnd, -(lengthDays - 1))
  return { start: newStart, end: newEnd }
}

export interface AoPeriodRow {
  campaign: string
  sent: number
  opens: number
  openRate: number
  paymentCount: number
  paymentRate: number
  payingMembers: number
  payingMemberRate: number
  /** 연관거래액 (즉차거래액) */
  grossAmount: number
}

/**
 * 특정 기간(start~end)의 AO 캠페인별 실적 리더보드.
 * 두 기간(예: 올해 vs 작년 동기간)을 나란히 비교하는 화면에서 각 기간을 독립적으로 호출해 쓴다.
 */
export function buildAoPeriodTable(rows: AoPushRow[], start: string, end: string): AoPeriodRow[] {
  const inRange = rows.filter(r => (!start || r.date >= start) && (!end || r.date <= end))

  const byCampaign = new Map<string, AoPushRow[]>()
  for (const r of inRange) {
    const key = aoCampaignKey(r)
    if (!key) continue
    const list = byCampaign.get(key) ?? []
    list.push(r)
    byCampaign.set(key, list)
  }

  return [...byCampaign.entries()].map(([campaign, rs]) => {
    const m = sumAoMetrics(rs)
    return {
      campaign,
      sent: m.sent,
      opens: m.opens,
      openRate: m.sent > 0 ? m.opens / m.sent : 0,
      paymentCount: m.paymentCount,
      paymentRate: m.sent > 0 ? m.paymentCount / m.sent : 0,
      payingMembers: m.payingMembers,
      payingMemberRate: m.sent > 0 ? m.payingMembers / m.sent : 0,
      grossAmount: m.grossAmount,
    }
  })
}

export type AoSortKey = 'name' | 'revenue' | 'reach' | 'paymentCount' | 'paymentRate'

export const AO_SORT_OPTIONS: { key: AoSortKey; label: string }[] = [
  { key: 'name', label: '캠페인명 (가나다순)' },
  { key: 'revenue', label: '연관거래액 높은순' },
  { key: 'reach', label: '수신 높은순' },
  { key: 'paymentCount', label: '결제건수 높은순' },
  { key: 'paymentRate', label: '구매전환율 높은순' },
]

interface AoSortable {
  campaign: string
  grossAmount: number
  sent: number
  paymentCount: number
}

function paymentRateOf(m: AoSortable): number {
  return m.sent > 0 ? m.paymentCount / m.sent : 0
}

/** 캠페인 목록/피벗 행 등을 공통 정렬 기준으로 정렬. rows 자체는 AoSortable 모양이 아니어도 toMetrics로 뽑아내면 됨 */
export function sortByAoMetric<T>(rowsIn: T[], sortKey: AoSortKey, toMetrics: (row: T) => AoSortable): T[] {
  const arr = [...rowsIn]
  arr.sort((a, b) => {
    const ma = toMetrics(a)
    const mb = toMetrics(b)
    if (sortKey === 'name') return ma.campaign.localeCompare(mb.campaign, 'ko')
    if (sortKey === 'revenue') return mb.grossAmount - ma.grossAmount
    if (sortKey === 'reach') return mb.sent - ma.sent
    if (sortKey === 'paymentRate') return paymentRateOf(mb) - paymentRateOf(ma)
    return mb.paymentCount - ma.paymentCount
  })
  return arr
}

// ─── 주의가 필요한 캠페인 (전주 대비 급락 감지) ──────────────────────────────

/** 이 비율 이상 하락하면 "주의 필요"로 표시 (예: 0.3 = 전주 대비 30% 이상 하락, 0건 포함) */
const ALERT_DROP_THRESHOLD = 0.3

export type AoAlertMetric = 'sent' | 'openRate' | 'grossAmount'

export type AoAlertBasis = 'week' | 'month'

export interface AoAlertCell {
  basis: AoAlertBasis
  metric: AoAlertMetric
  label: string
  previous: number
  current: number
  /** 증감률 (음수=하락). 비교 기준 기간에 발송 이력이 없으면 null */
  delta: number | null
  /** delta가 ALERT_DROP_THRESHOLD 이상 하락 */
  flagged: boolean
}

/** cells는 걸린 캠페인의 지표(3) × 기준(2) 전체 — 걸리지 않은 칸도 참고용으로 포함 */
export interface AoCampaignAlert {
  campaign: string
  cells: AoAlertCell[]
}

export interface AoAlertWindows {
  current: DateRange
  previousWeek: DateRange
  /** 이번 주 구간을 한 달 앞으로 민 같은 길이(7일) 구간 — 7일 구간은 요일 구성이 항상 같아 비교가 공정하다 */
  previousMonth: DateRange
}

/** 날짜를 n개월 이동 (말일 넘치면 그 달 말일로 보정, 예: 3/31 → 2/28) */
function shiftMonths(dateStr: string, n: number): string {
  const d = parseDateStr(dateStr)
  if (!d) return ''
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
  return toDateStr(d)
}

/**
 * 데이터에 존재하는 가장 최근 날짜가 속한 주는 아직 집계가 덜 채워졌을 수 있어(시트 업데이트 지연)
 * 비교 대상에서 제외한다. 그 직전 주를 "이번 주"로 보고, 전주(그 전전 주)와 전월 동기간을 비교 기준으로 삼는다.
 */
export function alertWindows(rows: AoPushRow[]): AoAlertWindows | null {
  if (rows.length === 0) return null
  const latestDate = rows.reduce((max, r) => (r.date > max ? r.date : max), rows[0].date)
  const start = addDays(weekStart(latestDate), -7)
  const monthStart = shiftMonths(start, -1)
  return {
    current: { start, end: addDays(start, 6) },
    previousWeek: { start: addDays(start, -7), end: addDays(start, -1) },
    previousMonth: { start: monthStart, end: addDays(monthStart, 6) },
  }
}

const ALERT_METRICS: [AoAlertMetric, string, (m: AoMonthlyMetrics) => number][] = [
  ['sent', '발송건수', m => m.sent],
  ['openRate', '오픈율(클릭률)', m => (m.sent > 0 ? m.opens / m.sent : 0)],
  ['grossAmount', '연관거래액', m => m.grossAmount],
]

function compareCells(basis: AoAlertBasis, curr: AoMonthlyMetrics, prev: AoMonthlyMetrics): AoAlertCell[] {
  return ALERT_METRICS.map(([metric, label, value]) => {
    const current = value(curr)
    const previous = value(prev)
    // 비교 기준 기간에 발송 이력이 없으면 하락 판단 불가
    const delta = prev.sent === 0 ? null : calcPeriodDelta(current, previous)
    return { basis, metric, label, previous, current, delta, flagged: delta !== null && delta <= -ALERT_DROP_THRESHOLD }
  })
}

/**
 * 발송건수/오픈율/연관거래액 중 하나라도 전주 또는 전월 동기간 대비 ALERT_DROP_THRESHOLD 이상 하락한 캠페인을 찾는다.
 * 비교 기준 기간에 발송 이력이 없는 캠페인은 그 기준에 한해 대상에서 제외한다.
 *
 * monitoredCampaigns에 포함된 캠페인만 검사한다 — 격주/월 단위로 몰아서 발송하는
 * 간헐적 캠페인은 전주 대비 비교 자체가 의미 없으므로(항상 "쉬는 주"가 있음),
 * 사용자가 설정 탭에서 직접 고른 "꾸준히 도는" 캠페인만 대상으로 삼는다.
 */
export function buildAoCampaignAlerts(rows: AoPushRow[], monitoredCampaigns: string[]): AoCampaignAlert[] {
  const w = alertWindows(rows)
  if (!w || monitoredCampaigns.length === 0) return []
  const monitoredSet = new Set(monitoredCampaigns)

  const byCampaign = new Map<string, AoPushRow[]>()
  for (const r of rows) {
    // 배리언트는 합산해서 캠페인(캠페인명_분할) 단위로 판단
    const key = r.campaignSplit
    if (!key || !monitoredSet.has(key)) continue
    const list = byCampaign.get(key) ?? []
    list.push(r)
    byCampaign.set(key, list)
  }

  const alerts: AoCampaignAlert[] = []
  for (const [campaign, campaignRows] of byCampaign) {
    const sumIn = (range: DateRange) => sumAoMetrics(campaignRows.filter(r => r.date >= range.start && r.date <= range.end))
    const curr = sumIn(w.current)
    const prevWeek = sumIn(w.previousWeek)
    const prevMonth = sumIn(w.previousMonth)
    const cells = [...compareCells('week', curr, prevWeek), ...compareCells('month', curr, prevMonth)]
    if (cells.some(c => c.flagged)) alerts.push({ campaign, cells })
  }

  // 고객사 관심사가 발송량 유지라, 발송건수가 떨어진 캠페인을 맨 위로 (그 안에서는 하락폭이 큰 순)
  const hasSent = (a: AoCampaignAlert) => a.cells.some(c => c.flagged && c.metric === 'sent')
  const worst = (a: AoCampaignAlert) => Math.max(...a.cells.filter(c => c.flagged).map(c => -(c.delta ?? 0)))
  return alerts.sort((a, b) => Number(hasSent(b)) - Number(hasSent(a)) || worst(b) - worst(a))
}
