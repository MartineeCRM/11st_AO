import type { MartineeUnionRow, DailyKpiRow, AttDataRow } from '@/types/sheets'
import type {
  DailyComboPoint,
  DailyRevenuePoint,
  Top10Item,
  Top10Metric,
  FunnelStep,
  BusinessKpiRow,
} from '@/types/metrics'
import { addDays, formatNumber, formatRate, formatRateWithCount, formatCurrency, formatDateShort, toDateStr, parseDateStr } from './formatters'

// ─── 기본 집계 ────────────────────────────────────────────────

export function calcSentImpression(rows: MartineeUnionRow[]): number {
  return rows.reduce((s, r) => s + r.sent + r.impressions, 0)
}

export function calcOpenClick(rows: MartineeUnionRow[]): number {
  return rows.reduce(
    (s, r) => s + r.total_opens + r.first_button_clicks + r.second_button_clicks + r.body_clicks,
    0,
  )
}

export function calcCTR(rows: MartineeUnionRow[]): number {
  const si = calcSentImpression(rows)
  if (si === 0) return 0
  return calcOpenClick(rows) / si
}

export function calcConversionA(rows: MartineeUnionRow[]): number {
  return rows.reduce((s, r) => s + r.conversion_a, 0)
}

export function calcCVR(rows: MartineeUnionRow[]): number {
  const si = calcSentImpression(rows)
  if (si === 0) return 0
  return calcConversionA(rows) / si
}

export function calcRevenuePerImpression(rows: MartineeUnionRow[]): number {
  const si = calcSentImpression(rows)
  if (si === 0) return 0
  const rev = rows.reduce((s, r) => s + r.revenue, 0)
  return rev / si
}

export function calcMsgPerUser(rows: MartineeUnionRow[]): number {
  const si = calcSentImpression(rows)
  const uniqueRecipients = rows.reduce((s, r) => s + r.unique_recipients, 0)
  if (uniqueRecipients === 0) return 0
  return si / uniqueRecipients
}

export function calcExpectedReward(ctr: number, cvr: number): number {
  return ctr * cvr
}

export function calcRevenuePerSend(rows: MartineeUnionRow[]): number {
  const si = calcSentImpression(rows)
  if (si === 0) return 0
  const rev = rows.reduce((s, r) => s + r.revenue, 0)
  return rev / si
}

/** WoW 변화율 (0.05 = +5%) */
export function calcWoW(current: number, previous: number): number {
  if (previous === 0) return 0
  return (current - previous) / previous
}

// ─── 날짜별 집계 ───────────────────────────────────────────────

/** martinee_union 행들을 날짜별 Map으로 그룹핑 */
function groupByDate(rows: MartineeUnionRow[]): Map<string, MartineeUnionRow[]> {
  const map = new Map<string, MartineeUnionRow[]>()
  for (const r of rows) {
    const existing = map.get(r.date) ?? []
    existing.push(r)
    map.set(r.date, existing)
  }
  return map
}

/** daily_kpi 행들을 날짜별 Map으로 그룹핑 */
function groupKpiByDate(rows: DailyKpiRow[]): Map<string, DailyKpiRow> {
  const map = new Map<string, DailyKpiRow>()
  for (const r of rows) map.set(r.date, r)
  return map
}

/** 최근 N일 날짜 목록 (오래된 순) */
function lastNDates(n: number, endDate: string): string[] {
  const end = endDate || toDateStr(new Date())
  const dates: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    dates.push(addDays(end, -i))
  }
  return dates
}

/** martinee_union 기준 14일 트렌드 (임의 field) */
export function calcTrend14d(
  rows: MartineeUnionRow[],
  field: 'sentImpression' | 'ctr' | 'cvr' | 'revenue' | 'msgPerUser',
  endDate: string,
): number[] {
  const byDate = groupByDate(rows)
  return lastNDates(14, endDate).map(date => {
    const dayRows = byDate.get(date) ?? []
    if (field === 'sentImpression') return calcSentImpression(dayRows)
    if (field === 'ctr') return calcCTR(dayRows)
    if (field === 'cvr') return calcCVR(dayRows)
    if (field === 'revenue') return dayRows.reduce((s, r) => s + r.revenue, 0)
    if (field === 'msgPerUser') return calcMsgPerUser(dayRows)
    return 0
  })
}

/** daily_kpi 기준 14일 트렌드 */
export function calcKpiTrend14d(
  rows: DailyKpiRow[],
  field: keyof Omit<DailyKpiRow, 'date'>,
  endDate: string,
): number[] {
  const byDate = groupKpiByDate(rows)
  return lastNDates(14, endDate).map(date => {
    const row = byDate.get(date)
    return row ? Number(row[field]) : 0
  })
}

/** daily_kpi 기준 14일 트렌드 (날짜 포함) */
export function calcKpiTrend14dWithDates(
  rows: DailyKpiRow[],
  field: keyof Omit<DailyKpiRow, 'date'>,
  endDate: string,
): { date: string; value: number }[] {
  const byDate = groupKpiByDate(rows)
  return lastNDates(14, endDate).map(date => ({
    date,
    value: byDate.get(date) ? Number(byDate.get(date)![field]) : 0,
  }))
}

/** daily_kpi 기준 30일 트렌드 */
export function calcKpiTrend30d(
  rows: DailyKpiRow[],
  field: keyof Omit<DailyKpiRow, 'date'>,
  endDate: string,
): number[] {
  const byDate = groupKpiByDate(rows)
  return lastNDates(30, endDate).map(date => {
    const row = byDate.get(date)
    return row ? Number(row[field]) : 0
  })
}

// ─── 콤보차트 데이터 ───────────────────────────────────────────

/** 일별 발송량/CTR/CVR 추이 (Row2 콤보차트) */
export function buildDailyComboData(rows: MartineeUnionRow[], limitDays?: number): DailyComboPoint[] {
  const byDate = groupByDate(rows)
  const dates = Array.from(byDate.keys()).sort()
  const visibleDates = limitDays ? dates.slice(-limitDays) : dates
  return visibleDates.map(date => {
    const dayRows = byDate.get(date)!
    return {
      date: formatDateShort(date),
      sentImpression: calcSentImpression(dayRows),
      openClick: calcOpenClick(dayRows),
      ctr: parseFloat((calcCTR(dayRows) * 100).toFixed(2)),
      cvr: parseFloat((calcCVR(dayRows) * 100).toFixed(2)),
    }
  })
}

/** Attribution 시트 기반 일별 발송&노출/오픈&클릭/CTR 추이 */
export function buildAttributionComboData(rows: AttDataRow[]): DailyComboPoint[] {
  const byDate = new Map<string, AttDataRow[]>()
  for (const row of rows) {
    const list = byDate.get(row.date) ?? []
    list.push(row)
    byDate.set(row.date, list)
  }
  const dates = Array.from(byDate.keys()).sort()
  return dates.map(date => {
    const dayRows = byDate.get(date)!
    const sentImpression = dayRows.reduce((sum, r) => sum + r.impression_or_send_user, 0)
    const openClick = dayRows.reduce((sum, r) => sum + r.open_or_click_user, 0)
    const ctr = sentImpression > 0 ? parseFloat(((openClick / sentImpression) * 100).toFixed(2)) : 0
    return { date: formatDateShort(date), sentImpression, openClick, ctr, cvr: 0 }
  })
}

/** 일별 Revenue/AOV/발송당Rev/예상Reward (Row5) */
export function buildDailyRevenueData(
  martinee: MartineeUnionRow[],
  kpi: DailyKpiRow[],
): DailyRevenuePoint[] {
  const byDateM = groupByDate(martinee)
  const byDateK = groupKpiByDate(kpi)
  const allDates = Array.from(
    new Set([...byDateM.keys(), ...byDateK.keys()]),
  ).sort()

  return allDates.map(date => {
    const mRows = byDateM.get(date) ?? []
    const kRow = byDateK.get(date)
    const ctr = calcCTR(mRows)
    const cvr = calcCVR(mRows)

    const dayRevenue = kRow?.revenue ?? mRows.reduce((s, r) => s + r.revenue, 0)
    const dayPurchaseCnt = kRow?.purchase_cnt ?? 0
    const daySI = calcSentImpression(mRows)
    const crmRevenue = mRows.reduce((s, r) => s + r.revenue, 0)

    return {
      date: formatDateShort(date),
      revenue: dayRevenue,
      aov: dayPurchaseCnt > 0 ? dayRevenue / dayPurchaseCnt : 0,
      revenuePerSend: daySI > 0 ? crmRevenue / daySI : 0,
      expectedReward: parseFloat((calcExpectedReward(ctr, cvr) * 100).toFixed(4)),
    }
  })
}

// ─── Top 10 ───────────────────────────────────────────────────

type CampaignKey = string

function groupByCampaign(
  rows: MartineeUnionRow[],
): Map<CampaignKey, MartineeUnionRow[]> {
  const map = new Map<CampaignKey, MartineeUnionRow[]>()
  for (const r of rows) {
    const key = r.campaign_depth_1
    if (!key) continue  // 이름 없는 항목 스킵
    const existing = map.get(key) ?? []
    existing.push(r)
    map.set(key, existing)
  }
  return map
}

export function buildTop10(
  rows: MartineeUnionRow[],
  kpiRows: DailyKpiRow[],
  metric: Top10Metric,
  type: 'campaign' | 'canvas',
): Top10Item[] {
  const byName = groupByCampaign(rows)

  const scored: { name: string; value: number; rawCount: number }[] = []
  byName.forEach((campaignRows, name) => {
    let value = 0
    let rawCount = 0
    if (metric === '발송/노출량') value = calcSentImpression(campaignRows)
    else if (metric === '오픈/클릭율') value = calcOpenClick(campaignRows)
    else if (metric === 'CTR') {
      value = calcCTR(campaignRows)
      rawCount = calcOpenClick(campaignRows)
    }
    else if (metric === '구매 CVR') {
      value = calcCVR(campaignRows)
      rawCount = calcConversionA(campaignRows)
    }
    else if (metric === 'Revenue') value = campaignRows.reduce((s, r) => s + r.revenue, 0)
    else if (metric === 'AOV') {
      const rev = campaignRows.reduce((s, r) => s + r.revenue, 0)
      const conv = campaignRows.reduce((s, r) => s + r.conversion_a, 0)
      value = conv > 0 ? rev / conv : 0
    }
    scored.push({ name, value, rawCount })
  })

  return scored
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .map(item => {
      let formattedValue = ''
      if (metric === 'CTR' || metric === '구매 CVR') formattedValue = formatRateWithCount(item.value, item.rawCount)
      else if (metric === 'AOV') formattedValue = formatCurrency(Math.round(item.value))
      else if (metric === 'Revenue') formattedValue = `₩${formatNumber(item.value)}`
      else formattedValue = formatNumber(item.value)
      return { name: item.name, value: item.value, formattedValue, type }
    })
}

// ─── 퍼널 ─────────────────────────────────────────────────────

export type FunnelFieldKey = string

export const FUNNEL_FIELD_LABELS: Record<string, string> = {}

export function buildFunnel(
  rows: DailyKpiRow[],
  steps: FunnelFieldKey[],
): FunnelStep[] {
  const totals = steps.map(field => rows.reduce((s, r) => s + Number((r as Record<string, unknown>)[field]), 0))
  return steps.map((field, i) => ({
    label: FUNNEL_FIELD_LABELS[field] ?? field,
    field,
    value: totals[i],
    rate: i === 0 ? null : totals[i - 1] > 0 ? totals[i] / totals[i - 1] : 0,
  }))
}

// ─── 비즈니스 지표 테이블 ──────────────────────────────────────

/** 특정 기간 daily_kpi 합산 */
function sumKpi(rows: DailyKpiRow[], field: FunnelFieldKey): number {
  return rows.reduce((s, r) => s + Number(r[field]), 0)
}

/** 평균 (AOV, ARPU, ARPPU 등 단가 지표) */
function avgKpi(rows: DailyKpiRow[], field: FunnelFieldKey): number {
  if (rows.length === 0) return 0
  return sumKpi(rows, field) / rows.length
}

function filterByDateRange(rows: DailyKpiRow[], start: string, end: string) {
  return rows.filter(r => r.date >= start && r.date <= end)
}

function shiftDays(dateStr: string, n: number): string {
  return addDays(dateStr, n)
}

function calcRatioTrend30d(
  rows: DailyKpiRow[],
  numeratorField: FunnelFieldKey,
  denominatorField: FunnelFieldKey,
  endDate: string,
): number[] {
  const byDate = groupKpiByDate(rows)
  return lastNDates(30, endDate).map(date => {
    const row = byDate.get(date)
    if (!row) return 0
    const numerator = Number(row[numeratorField])
    const denominator = Number(row[denominatorField])
    return denominator > 0 ? numerator / denominator : 0
  })
}

export function buildBusinessKpiTable(
  rows: DailyKpiRow[],
  currentStart: string,
  currentEnd: string,
): BusinessKpiRow[] {
  const current = filterByDateRange(rows, currentStart, currentEnd)
  const days = current.length || 1

  // WoW: 같은 기간, 7일 전
  const wowStart = shiftDays(currentStart, -7)
  const wowEnd = shiftDays(currentEnd, -7)
  const wowPeriod = filterByDateRange(rows, wowStart, wowEnd)

  // MoM: 같은 기간, 약 30일 전
  const momStart = shiftDays(currentStart, -30)
  const momEnd = shiftDays(currentEnd, -30)
  const momPeriod = filterByDateRange(rows, momStart, momEnd)

  // YoY: 365일 전
  const yoyStart = shiftDays(currentStart, -365)
  const yoyEnd = shiftDays(currentEnd, -365)
  const yoyPeriod = filterByDateRange(rows, yoyStart, yoyEnd)

  function safeWoW(cur: number, prev: number) {
    if (prev === 0) return null
    return (cur - prev) / prev
  }

  const endDate = currentEnd || rows[rows.length - 1]?.date || toDateStr(new Date())

  const definitions: {
    metric: string
    field: FunnelFieldKey
    isAvg?: boolean
    isRate?: boolean
    isCurrency?: boolean
    isFullNumber?: boolean
  }[] = [
    { metric: 'Revenue', field: 'revenue', isCurrency: true },
    { metric: 'DAU', field: 'dau' },
    { metric: 'MAU', field: 'mau' },
    { metric: 'AOV', field: 'aov', isAvg: true, isFullNumber: true },
    { metric: 'ARPU', field: 'arpu', isAvg: true, isFullNumber: true },
    { metric: 'ARPPU', field: 'arppu', isAvg: true, isFullNumber: true },
    { metric: 'purchase_cnt', field: 'purchase_cnt' },
    { metric: '활성 대비 구매 비중', field: 'purchase_cnt', isRate: true },
  ]

  return definitions.map(def => {
    let curVal: number
    let wowVal: number
    let momVal: number
    let yoyVal: number

    if (def.isRate && def.field === 'purchase_cnt') {
      // 활성 대비 구매 비중 = purchase_cnt / dau
      const curDau = sumKpi(current, 'dau')
      const wowDau = sumKpi(wowPeriod, 'dau')
      const momDau = sumKpi(momPeriod, 'dau')
      const yoyDau = sumKpi(yoyPeriod, 'dau')
      curVal = curDau > 0 ? sumKpi(current, 'purchase_cnt') / curDau : 0
      wowVal = wowDau > 0 ? sumKpi(wowPeriod, 'purchase_cnt') / wowDau : 0
      momVal = momDau > 0 ? sumKpi(momPeriod, 'purchase_cnt') / momDau : 0
      yoyVal = yoyDau > 0 ? sumKpi(yoyPeriod, 'purchase_cnt') / yoyDau : 0
    } else if (def.metric === 'AOV' || def.metric === 'ARPPU') {
      const getVal = (rows: DailyKpiRow[]) => {
        const rev = sumKpi(rows, 'revenue')
        const cnt = sumKpi(rows, 'purchase_cnt')
        return cnt > 0 ? rev / cnt : 0
      }
      curVal = getVal(current)
      wowVal = getVal(wowPeriod)
      momVal = getVal(momPeriod)
      yoyVal = getVal(yoyPeriod)
    } else if (def.metric === 'ARPU') {
      const getVal = (rows: DailyKpiRow[]) => {
        const rev = sumKpi(rows, 'revenue')
        const dau = sumKpi(rows, 'dau')
        return dau > 0 ? rev / dau : 0
      }
      curVal = getVal(current)
      wowVal = getVal(wowPeriod)
      momVal = getVal(momPeriod)
      yoyVal = getVal(yoyPeriod)
    } else if (def.isAvg) {
      curVal = avgKpi(current, def.field)
      wowVal = avgKpi(wowPeriod, def.field)
      momVal = avgKpi(momPeriod, def.field)
      yoyVal = avgKpi(yoyPeriod, def.field)
    } else {
      curVal = sumKpi(current, def.field)
      wowVal = sumKpi(wowPeriod, def.field)
      momVal = sumKpi(momPeriod, def.field)
      yoyVal = sumKpi(yoyPeriod, def.field)
    }

    void days // suppress unused warning

    let formattedCurrent: string
    if (def.isRate) formattedCurrent = formatRate(curVal)
    else if (def.isFullNumber) formattedCurrent = `₩${Math.round(curVal).toLocaleString('ko-KR')}`
    else if (def.isCurrency) formattedCurrent = `₩${formatNumber(curVal)}`
    else formattedCurrent = formatNumber(curVal)

    const trend =
      def.isRate && def.field === 'purchase_cnt'
        ? calcRatioTrend30d(rows, 'purchase_cnt', 'dau', endDate)
        : calcKpiTrend30d(rows, def.field, endDate)

    return {
      metric: def.metric,
      field: def.field,
      current: curVal,
      formattedCurrent,
      wow: safeWoW(curVal, wowVal),
      mom: safeWoW(curVal, momVal),
      yoy: safeWoW(curVal, yoyVal),
      trend,
      isRate: def.isRate,
      isCurrency: def.isCurrency,
      isFullNumber: def.isFullNumber,
    }
  })
}

// ─── AO(Always-on) 캠페인 모니터링 ──────────────────────────────

/** campaign_type이 AO(Always-on)인 행만 필터링 */
export function filterAoRows(rows: MartineeUnionRow[]): MartineeUnionRow[] {
  return rows.filter(r => r.campaign_type === 'AO')
}

/** AO 캠페인 목록 (campaign_depth_1 기준 — variant/CG·TG를 하나의 캠페인으로 묶음), 가나다순 */
export function listAoCampaignNames(rows: MartineeUnionRow[]): string[] {
  const names = new Set<string>()
  for (const r of rows) {
    if (r.campaign_depth_1) names.add(r.campaign_depth_1)
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'ko'))
}

export interface AoTrendPoint {
  period: string
  sentImpression: number
  conversionA: number
  revenue: number
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

/** 특정 AO 캠페인(campaign_depth_1)의 주/월 단위 합산 추이 */
export function buildAoCampaignTrend(
  rows: MartineeUnionRow[],
  campaignDepth1: string,
  granularity: 'week' | 'month',
): AoTrendPoint[] {
  const campaignRows = rows.filter(r => r.campaign_depth_1 === campaignDepth1)
  const byPeriod = new Map<string, MartineeUnionRow[]>()
  for (const r of campaignRows) {
    const key = granularity === 'week' ? weekStart(r.date) : monthStart(r.date)
    const list = byPeriod.get(key) ?? []
    list.push(r)
    byPeriod.set(key, list)
  }
  return [...byPeriod.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, rs]) => ({
      period: granularity === 'week' ? formatDateShort(period) : monthLabel(period),
      sentImpression: calcSentImpression(rs),
      conversionA: calcConversionA(rs),
      revenue: rs.reduce((s, r) => s + r.revenue, 0),
    }))
}

export interface AoMonthlyMetrics {
  impressions: number
  sent: number
  conversionA: number
  conversionB: number
  conversionC: number
  conversionD: number
  revenue: number
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

function sumAoMetrics(rs: MartineeUnionRow[]): AoMonthlyMetrics {
  return {
    impressions: rs.reduce((s, r) => s + r.impressions, 0),
    sent: rs.reduce((s, r) => s + r.sent, 0),
    conversionA: rs.reduce((s, r) => s + r.conversion_a, 0),
    conversionB: rs.reduce((s, r) => s + r.conversion_b, 0),
    conversionC: rs.reduce((s, r) => s + r.conversion_c, 0),
    conversionD: rs.reduce((s, r) => s + r.conversion_d, 0),
    revenue: rs.reduce((s, r) => s + r.revenue, 0),
  }
}

/** 날짜 → 연 (YYYY) */
function yearOf(dateStr: string): string {
  return dateStr.slice(0, 4)
}

/** AO 데이터에 존재하는 전체 연도 목록 (최신순) — 장기 운영 캠페인이 여러 해에 걸쳐 있을 수 있음 */
export function listAoYears(rows: MartineeUnionRow[]): string[] {
  return [...new Set(rows.map(r => yearOf(r.date)))].sort().reverse()
}

/**
 * AO 캠페인 실적 피벗 (연도 단위로 펼침/접음 가능).
 * years에 포함된 해에 한 번이라도 발송한 캠페인만 행으로 포함하고,
 * 캠페인·월 조합에 실제 발송 데이터가 없으면 byMonth에 항목 자체를 만들지 않는다.
 */
export function buildAoPivot(rows: MartineeUnionRow[], years: string[]): AoPivotResult {
  const yearSet = new Set(years)
  const relevantRows = rows.filter(r => yearSet.has(yearOf(r.date)))

  const monthsByYear: Record<string, string[]> = {}
  for (const year of years) {
    monthsByYear[year] = [...new Set(
      relevantRows.filter(r => yearOf(r.date) === year).map(r => monthStart(r.date)),
    )].sort().reverse()
  }

  const byCampaign = new Map<string, MartineeUnionRow[]>()
  for (const r of relevantRows) {
    if (!r.campaign_depth_1) continue
    const list = byCampaign.get(r.campaign_depth_1) ?? []
    list.push(r)
    byCampaign.set(r.campaign_depth_1, list)
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

export interface AoPeriodRow {
  campaign: string
  impressions: number
  sent: number
  conversionA: number
  /** conversionA ÷ (impressions + sent) */
  conversionRate: number
  revenue: number
}

/**
 * 특정 기간(start~end)의 AO 캠페인별 실적 리더보드. Revenue 내림차순으로 정렬한다.
 * 두 기간(예: 올해 vs 작년 동기간)을 나란히 비교하는 화면에서 각 기간을 독립적으로 호출해 쓴다.
 */
export function buildAoPeriodTable(rows: MartineeUnionRow[], start: string, end: string): AoPeriodRow[] {
  const inRange = rows.filter(r => (!start || r.date >= start) && (!end || r.date <= end))

  const byCampaign = new Map<string, MartineeUnionRow[]>()
  for (const r of inRange) {
    if (!r.campaign_depth_1) continue
    const list = byCampaign.get(r.campaign_depth_1) ?? []
    list.push(r)
    byCampaign.set(r.campaign_depth_1, list)
  }

  return [...byCampaign.entries()]
    .map(([campaign, rs]) => {
      const impressions = rs.reduce((s, r) => s + r.impressions, 0)
      const sent = rs.reduce((s, r) => s + r.sent, 0)
      const conversionA = rs.reduce((s, r) => s + r.conversion_a, 0)
      const revenue = rs.reduce((s, r) => s + r.revenue, 0)
      const base = impressions + sent
      return {
        campaign,
        impressions,
        sent,
        conversionA,
        conversionRate: base > 0 ? conversionA / base : 0,
        revenue,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)
}
