import type { MartineeUnionRow, DailyKpiRow } from '@/types/sheets'
import type {
  DailyComboPoint,
  DailyRevenuePoint,
  Top10Item,
  Top10Metric,
  FunnelStep,
  BusinessKpiRow,
} from '@/types/metrics'
import { addDays, formatNumber, formatRate, formatCurrency, formatDateShort, toDateStr } from './formatters'

// ─── 기본 집계 ────────────────────────────────────────────────

export function calcSentImpression(rows: MartineeUnionRow[]): number {
  return rows.reduce((s, r) => s + r.sent + r.impression, 0)
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

export function calcCVR(rows: MartineeUnionRow[]): number {
  const si = calcSentImpression(rows)
  if (si === 0) return 0
  const convA = rows.reduce((s, r) => s + r.conversion_a, 0)
  return convA / si
}

export function calcRevenuePerImpression(rows: MartineeUnionRow[]): number {
  const si = calcSentImpression(rows)
  if (si === 0) return 0
  const rev = rows.reduce((s, r) => s + r.revenue, 0)
  return rev / si
}

export function calcMsgPerUser(rows: MartineeUnionRow[]): number {
  const si = calcSentImpression(rows)
  const uniqueRecipient = rows.reduce((s, r) => s + r.unique_recipient, 0)
  if (uniqueRecipient === 0) return 0
  return si / uniqueRecipient
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
  field: 'sentImpression' | 'ctr' | 'cvr' | 'revenue',
  endDate: string,
): number[] {
  const byDate = groupByDate(rows)
  return lastNDates(14, endDate).map(date => {
    const dayRows = byDate.get(date) ?? []
    if (field === 'sentImpression') return calcSentImpression(dayRows)
    if (field === 'ctr') return calcCTR(dayRows)
    if (field === 'cvr') return calcCVR(dayRows)
    if (field === 'revenue') return dayRows.reduce((s, r) => s + r.revenue, 0)
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

    return {
      date: formatDateShort(date),
      revenue: dayRevenue,
      aov: dayPurchaseCnt > 0 ? dayRevenue / dayPurchaseCnt : 0,
      revenuePerSend: daySI > 0 ? dayRevenue / daySI : 0,
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

  const scored: { name: string; value: number }[] = []
  byName.forEach((campaignRows, name) => {
    let value = 0
    if (metric === '발송/노출량') value = calcSentImpression(campaignRows)
    else if (metric === '오픈/클릭율') value = calcOpenClick(campaignRows)
    else if (metric === 'CTR') value = calcCTR(campaignRows)
    else if (metric === '구매 CVR') value = calcCVR(campaignRows)
    else if (metric === 'Revenue') value = campaignRows.reduce((s, r) => s + r.revenue, 0)
    else if (metric === 'AOV') {
      const rev = campaignRows.reduce((s, r) => s + r.revenue, 0)
      const conv = campaignRows.reduce((s, r) => s + r.conversion_a, 0)
      value = conv > 0 ? rev / conv : 0
    }
    scored.push({ name, value })
  })

  return scored
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .map(item => {
      let formattedValue = ''
      if (metric === 'CTR' || metric === '구매 CVR') formattedValue = formatRate(item.value)
      else if (metric === 'AOV') formattedValue = formatCurrency(Math.round(item.value))
      else if (metric === 'Revenue') formattedValue = `₩${formatNumber(item.value)}`
      else formattedValue = formatNumber(item.value)
      return { name: item.name, value: item.value, formattedValue, type }
    })
}

// ─── 퍼널 ─────────────────────────────────────────────────────

export type FunnelFieldKey = keyof Omit<DailyKpiRow, 'date'>

export const FUNNEL_FIELD_LABELS: Record<string, string> = {
  dau: 'DAU',
  mau: 'MAU',
  push_opt_in: 'Push 수신동의',
  sms_opt_in: 'SMS 수신동의',
  kakao_opt_in: '카카오 수신동의',
  view_promotion_list_page: '프로모션 조회',
  view_product_detail: '제품 상세 조회',
  view_cartpage: '카트 조회',
  like_brand: '브랜드 좋아요',
  like_product: '제품 좋아요',
  purchase_cnt: '구매 건수',
  complete_order_product: '구매 제품 수',
  first_purchase: '첫 구매',
}

export function buildFunnel(
  rows: DailyKpiRow[],
  steps: FunnelFieldKey[],
): FunnelStep[] {
  const totals = steps.map(field => rows.reduce((s, r) => s + Number(r[field]), 0))
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
    else if (def.isFullNumber) formattedCurrent = `₩${curVal.toLocaleString('ko-KR')}`
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
