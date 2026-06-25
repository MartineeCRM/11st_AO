import { useMemo } from 'react'
import type { MartineeUnionRow, DailyKpiRow } from '@/types/sheets'
import type { KpiCardData, OptInData } from '@/types/metrics'
import {
  calcSentImpression,
  calcCTR,
  calcMsgPerUser,
  calcWoW,
  calcTrend14d,
  calcKpiTrend14d,
  calcKpiTrend14dWithDates,
  buildDailyComboData,
  buildDailyRevenueData,
  buildTop10,
  buildFunnel,
  buildBusinessKpiTable,
  type FunnelFieldKey,
} from '@/lib/metrics'
import { formatNumber, formatRate, daysAgo, toDateStr } from '@/lib/formatters'
import { isAnomaly } from '@/lib/anomalyThresholds'
import type { Top10Metric } from '@/types/metrics'

interface UseMetricsOptions {
  top10Metric: Top10Metric
  funnelSteps: FunnelFieldKey[]
  currentStart: string
  currentEnd: string
}

export function useMetrics(
  filteredMartinee: MartineeUnionRow[],
  filteredKpi: DailyKpiRow[],
  allMartinee: MartineeUnionRow[],
  allKpi: DailyKpiRow[],
  opts: UseMetricsOptions,
) {
  const today = toDateStr(new Date())
  const endDate = opts.currentEnd || today
  const startDate = opts.currentStart || today
  const wowStart = daysAgo(7, new Date(startDate))
  const wowEnd = daysAgo(7, new Date(endDate))
  const momStart = daysAgo(30, new Date(startDate))
  const momEnd = daysAgo(30, new Date(endDate))

  // WoW 비교용 이전 주 데이터
  const prevMartinee = useMemo(
    () => allMartinee.filter(r => r.date >= wowStart && r.date <= wowEnd),
    [allMartinee, wowStart, wowEnd],
  )
  const prevKpi = useMemo(
    () => allKpi.filter(r => r.date >= wowStart && r.date <= wowEnd),
    [allKpi, wowStart, wowEnd],
  )

  // MoM 비교용 전월 데이터
  const momMartinee = useMemo(
    () => allMartinee.filter(r => r.date >= momStart && r.date <= momEnd),
    [allMartinee, momStart, momEnd],
  )
  const momKpi = useMemo(
    () => allKpi.filter(r => r.date >= momStart && r.date <= momEnd),
    [allKpi, momStart, momEnd],
  )

  // ── KPI 카드 데이터 ──────────────────────────────────────
  const kpiCards: KpiCardData[] = useMemo(() => {
    const curSI = calcSentImpression(filteredMartinee)
    const prevSI = calcSentImpression(prevMartinee)
    const momSI = calcSentImpression(momMartinee)
    const curCTR = calcCTR(filteredMartinee)
    const prevCTR = calcCTR(prevMartinee)
    const momCTR = calcCTR(momMartinee)
    const curMsg = calcMsgPerUser(filteredMartinee)
    const prevMsg = calcMsgPerUser(prevMartinee)
    const momMsg = calcMsgPerUser(momMartinee)

    // 수신동의는 누적 지표 — 각 구간 마지막 날의 값 사용
    const sortedAllKpi = [...allKpi].sort((a, b) => a.date.localeCompare(b.date))
    const pushRowCur = sortedAllKpi.filter(r => r.date <= endDate)
    const pushRowPrev = sortedAllKpi.filter(r => r.date <= wowEnd)
    const pushRowMom = sortedAllKpi.filter(r => r.date <= momEnd)
    const curPush = pushRowCur.length > 0 ? pushRowCur[pushRowCur.length - 1].push_opt_in : 0
    const prevPush = pushRowPrev.length > 0 ? pushRowPrev[pushRowPrev.length - 1].push_opt_in : 0
    const momPush = pushRowMom.length > 0 ? pushRowMom[pushRowMom.length - 1].push_opt_in : 0
    const curDAU = filteredKpi.reduce((s, r) => s + r.dau, 0) / (filteredKpi.length || 1)
    const prevDAU = prevKpi.reduce((s, r) => s + r.dau, 0) / (prevKpi.length || 1)
    const momDAU = momKpi.reduce((s, r) => s + r.dau, 0) / (momKpi.length || 1)
    const curMAU = filteredKpi.length > 0 ? filteredKpi[filteredKpi.length - 1].mau : 0
    const prevMAU = prevKpi.length > 0 ? prevKpi[prevKpi.length - 1].mau : 0
    const momMAU = momKpi.length > 0 ? momKpi[momKpi.length - 1].mau : 0
    const curRev = filteredKpi.reduce((s, r) => s + r.revenue, 0)
    const prevRev = prevKpi.reduce((s, r) => s + r.revenue, 0)
    const momRev = momKpi.reduce((s, r) => s + r.revenue, 0)

    const wowPush = calcWoW(curPush, prevPush)
    const wowDAU = calcWoW(curDAU, prevDAU)
    const wowRev = calcWoW(curRev, prevRev)
    const wowSI = calcWoW(curSI, prevSI)
    const wowCTR = calcWoW(curCTR, prevCTR)
    const wowMsg = calcWoW(curMsg, prevMsg)

    return [
      {
        label: '푸시 수신동의',
        value: curPush,
        formattedValue: formatNumber(Math.round(curPush)),
        wow: wowPush,
        mom: momKpi.length > 0 ? calcWoW(curPush, momPush) : null,
        trendData: calcKpiTrend14d(allKpi, 'push_opt_in', endDate),
        icon: 'bell',
        anomaly: isAnomaly('push_opt_in', wowPush),
        primary: true,
      },
      {
        label: 'DAU',
        value: curDAU,
        formattedValue: formatNumber(Math.round(curDAU)),
        wow: wowDAU,
        mom: momKpi.length > 0 ? calcWoW(curDAU, momDAU) : null,
        trendData: calcKpiTrend14d(allKpi, 'dau', endDate),
        icon: 'users',
        anomaly: isAnomaly('dau', wowDAU),
      },
      {
        label: 'MAU',
        value: curMAU,
        formattedValue: formatNumber(curMAU),
        wow: calcWoW(curMAU, prevMAU),
        mom: momKpi.length > 0 ? calcWoW(curMAU, momMAU) : null,
        trendData: calcKpiTrend14d(allKpi, 'mau', endDate),
        icon: 'users',
      },
      {
        label: 'Revenue',
        value: curRev,
        formattedValue: `₩${formatNumber(curRev)}`,
        wow: wowRev,
        mom: momKpi.length > 0 ? calcWoW(curRev, momRev) : null,
        trendData: calcKpiTrend14d(allKpi, 'revenue', endDate),
        icon: 'circle-dollar-sign',
        isCurrency: true,
        anomaly: isAnomaly('revenue', wowRev),
        primary: true,
      },
      {
        label: '전체 발송/노출',
        value: curSI,
        formattedValue: formatNumber(curSI),
        wow: wowSI,
        mom: momMartinee.length > 0 ? calcWoW(curSI, momSI) : null,
        trendData: calcTrend14d(allMartinee, 'sentImpression', endDate),
        icon: 'send',
        anomaly: isAnomaly('sentImpression', wowSI),
      },
      {
        label: '전체 평균 CTR',
        value: curCTR,
        formattedValue: formatRate(curCTR),
        wow: wowCTR,
        mom: momMartinee.length > 0 ? calcWoW(curCTR, momCTR) : null,
        trendData: calcTrend14d(allMartinee, 'ctr', endDate),
        icon: 'mouse-pointer-click',
        isRate: true,
        anomaly: isAnomaly('ctr', wowCTR),
      },
      {
        label: '유저당 메시지 수',
        value: curMsg,
        formattedValue: curMsg.toFixed(1),
        wow: wowMsg,
        mom: momMartinee.length > 0 ? calcWoW(curMsg, momMsg) : null,
        trendData: calcTrend14d(allMartinee, 'msgPerUser', endDate),
        icon: 'message-square',
      },
    ]
  }, [filteredMartinee, filteredKpi, prevMartinee, prevKpi, momMartinee, momKpi, allKpi, allMartinee, endDate, wowEnd, momEnd])

  // ── 수신동의 카드 ─────────────────────────────────────────
  const optInData: OptInData[] = useMemo(() => {
    // 수신동의는 누적 지표 — endDate 이하에서 가장 가까운 날의 값을 allKpi에서 찾음
    const sortedAll = [...allKpi].sort((a, b) => a.date.localeCompare(b.date))
    const curRows = sortedAll.filter(r => r.date <= endDate)
    const latestRow = curRows.length > 0 ? curRows[curRows.length - 1] : null
    const prevEndDate = wowEnd
    const prevRows = sortedAll.filter(r => r.date <= prevEndDate)
    const prevLatestRow = prevRows.length > 0 ? prevRows[prevRows.length - 1] : null
    const curPush = latestRow?.push_opt_in ?? 0
    const prevPushRow = prevLatestRow?.push_opt_in ?? 0
    const curSms = latestRow?.sms_opt_in ?? 0
    const prevSms = prevLatestRow?.sms_opt_in ?? 0
    const curKakao = latestRow?.kakao_opt_in ?? 0
    const prevKakao = prevLatestRow?.kakao_opt_in ?? 0
    return [
      {
        label: '푸시 수신 동의',
        icon: 'bell-ring',
        value: curPush,
        wow: calcWoW(curPush, prevPushRow),
        trendData: calcKpiTrend14dWithDates(allKpi, 'push_opt_in', endDate),
        color: '#0066cc',
      },
      {
        label: 'SMS 수신 동의',
        icon: 'message-square',
        value: curSms,
        wow: calcWoW(curSms, prevSms),
        trendData: calcKpiTrend14dWithDates(allKpi, 'sms_opt_in', endDate),
        color: '#10B981',
      },
      {
        label: '카카오 수신 동의',
        icon: 'message-circle',
        value: curKakao,
        wow: calcWoW(curKakao, prevKakao),
        trendData: calcKpiTrend14dWithDates(allKpi, 'kakao_opt_in', endDate),
        color: '#F59E0B',
      },
    ]
  }, [allKpi, endDate, wowEnd])

  // ── 차트 데이터 ───────────────────────────────────────────
  const dailyCombo = useMemo(() => buildDailyComboData(filteredMartinee), [filteredMartinee])

  const top10 = useMemo(
    () => buildTop10(filteredMartinee, filteredKpi, opts.top10Metric, 'campaign'),
    [filteredMartinee, filteredKpi, opts.top10Metric],
  )

  const funnel = useMemo(
    () => buildFunnel(filteredKpi, opts.funnelSteps),
    [filteredKpi, opts.funnelSteps],
  )

  const dailyRevenue = useMemo(
    () => buildDailyRevenueData(filteredMartinee, filteredKpi),
    [filteredMartinee, filteredKpi],
  )

  const bizKpiTable = useMemo(
    () => buildBusinessKpiTable(allKpi, startDate, endDate),
    [allKpi, startDate, endDate],
  )

  return { kpiCards, optInData, dailyCombo, top10, funnel, dailyRevenue, bizKpiTable }
}
