import { useMemo } from 'react'
import type { MartineeUnionRow, DailyKpiRow } from '@/types/sheets'
import type { KpiCardData, OptInData } from '@/types/metrics'
import {
  calcSentImpression,
  calcCTR,
  calcCVR,
  calcMsgPerUser,
  calcWoW,
  calcTrend14d,
  calcKpiTrend14d,
  buildDailyComboData,
  buildDailyRevenueData,
  buildTop10,
  buildFunnel,
  buildBusinessKpiTable,
  type FunnelFieldKey,
} from '@/lib/metrics'
import { formatNumber, formatRate, daysAgo } from '@/lib/formatters'
import type { Top10Metric } from '@/types/metrics'

interface UseMetricsOptions {
  top10Metric: Top10Metric
  top10Type: 'campaign' | 'canvas'
  funnelSteps: [FunnelFieldKey, FunnelFieldKey]
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
  const today = new Date().toISOString().slice(0, 10)
  const endDate = opts.currentEnd || today
  const startDate = opts.currentStart || today
  const wowStart = daysAgo(7, new Date(startDate))
  const wowEnd = daysAgo(7, new Date(endDate))

  // WoW 비교용 이전 주 데이터
  const prevMartinee = useMemo(
    () => allMartinee.filter(r => r.date >= wowStart && r.date <= wowEnd),
    [allMartinee, wowStart, wowEnd],
  )
  const prevKpi = useMemo(
    () => allKpi.filter(r => r.date >= wowStart && r.date <= wowEnd),
    [allKpi, wowStart, wowEnd],
  )

  // ── KPI 카드 데이터 ──────────────────────────────────────
  const kpiCards: KpiCardData[] = useMemo(() => {
    const curSI = calcSentImpression(filteredMartinee)
    const prevSI = calcSentImpression(prevMartinee)
    const curCTR = calcCTR(filteredMartinee)
    const prevCTR = calcCTR(prevMartinee)
    const curMsg = calcMsgPerUser(filteredMartinee)
    const prevMsg = calcMsgPerUser(prevMartinee)

    const curPush = filteredKpi.reduce((s, r) => s + r.push_opt_in, 0) / (filteredKpi.length || 1)
    const prevPush = prevKpi.reduce((s, r) => s + r.push_opt_in, 0) / (prevKpi.length || 1)
    const curDAU = filteredKpi.reduce((s, r) => s + r.dau, 0) / (filteredKpi.length || 1)
    const prevDAU = prevKpi.reduce((s, r) => s + r.dau, 0) / (prevKpi.length || 1)
    const curMAU = filteredKpi.length > 0 ? filteredKpi[filteredKpi.length - 1].mau : 0
    const prevMAU = prevKpi.length > 0 ? prevKpi[prevKpi.length - 1].mau : 0
    const curRev = filteredKpi.reduce((s, r) => s + r.revenue, 0)
    const prevRev = prevKpi.reduce((s, r) => s + r.revenue, 0)

    return [
      {
        label: '푸시 수신동의',
        value: curPush,
        formattedValue: formatNumber(Math.round(curPush)),
        wow: calcWoW(curPush, prevPush),
        trendData: calcKpiTrend14d(allKpi, 'push_opt_in', endDate),
        icon: 'bell',
      },
      {
        label: 'DAU',
        value: curDAU,
        formattedValue: formatNumber(Math.round(curDAU)),
        wow: calcWoW(curDAU, prevDAU),
        trendData: calcKpiTrend14d(allKpi, 'dau', endDate),
        icon: 'users',
      },
      {
        label: 'MAU',
        value: curMAU,
        formattedValue: formatNumber(curMAU),
        wow: calcWoW(curMAU, prevMAU),
        trendData: calcKpiTrend14d(allKpi, 'mau', endDate),
        icon: 'users',
      },
      {
        label: 'Revenue',
        value: curRev,
        formattedValue: `₩${formatNumber(curRev)}`,
        wow: calcWoW(curRev, prevRev),
        trendData: calcKpiTrend14d(allKpi, 'revenue', endDate),
        icon: 'circle-dollar-sign',
        isCurrency: true,
      },
      {
        label: '전체 발송/노출',
        value: curSI,
        formattedValue: formatNumber(curSI),
        wow: calcWoW(curSI, prevSI),
        trendData: calcTrend14d(allMartinee, 'sentImpression', endDate),
        icon: 'send',
      },
      {
        label: '전체 평균 CTR',
        value: curCTR,
        formattedValue: formatRate(curCTR),
        wow: calcWoW(curCTR, prevCTR),
        trendData: calcTrend14d(allMartinee, 'ctr', endDate),
        icon: 'mouse-pointer-click',
        isRate: true,
      },
      {
        label: '유저당 메시지 수',
        value: curMsg,
        formattedValue: curMsg.toFixed(1),
        wow: calcWoW(curMsg, prevMsg),
        trendData: [],
        icon: 'message-square',
      },
    ]
  }, [filteredMartinee, filteredKpi, prevMartinee, prevKpi, allKpi, allMartinee, endDate])

  // ── 수신동의 카드 ─────────────────────────────────────────
  const optInData: OptInData[] = useMemo(() => {
    const curPush = filteredKpi.length > 0 ? filteredKpi[filteredKpi.length - 1].push_opt_in : 0
    const prevPushRow = prevKpi.length > 0 ? prevKpi[prevKpi.length - 1].push_opt_in : 0
    const curSms = filteredKpi.length > 0 ? filteredKpi[filteredKpi.length - 1].sms_opt_in : 0
    const prevSms = prevKpi.length > 0 ? prevKpi[prevKpi.length - 1].sms_opt_in : 0
    const curKakao = filteredKpi.length > 0 ? filteredKpi[filteredKpi.length - 1].kakao_opt_in : 0
    const prevKakao = prevKpi.length > 0 ? prevKpi[prevKpi.length - 1].kakao_opt_in : 0
    return [
      {
        label: '푸시 수신 동의',
        icon: 'bell-ring',
        value: curPush,
        wow: calcWoW(curPush, prevPushRow),
        trendData: calcKpiTrend14d(allKpi, 'push_opt_in', endDate),
        color: '#4361EE',
      },
      {
        label: 'SMS 수신 동의',
        icon: 'message-square',
        value: curSms,
        wow: calcWoW(curSms, prevSms),
        trendData: calcKpiTrend14d(allKpi, 'sms_opt_in', endDate),
        color: '#10B981',
      },
      {
        label: '카카오 수신 동의',
        icon: 'message-circle',
        value: curKakao,
        wow: calcWoW(curKakao, prevKakao),
        trendData: calcKpiTrend14d(allKpi, 'kakao_opt_in', endDate),
        color: '#F59E0B',
      },
    ]
  }, [filteredKpi, prevKpi, allKpi, endDate])

  // ── 차트 데이터 ───────────────────────────────────────────
  const dailyCombo = useMemo(() => buildDailyComboData(filteredMartinee), [filteredMartinee])

  const top10 = useMemo(
    () => buildTop10(filteredMartinee, filteredKpi, opts.top10Metric, opts.top10Type),
    [filteredMartinee, filteredKpi, opts.top10Metric, opts.top10Type],
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
    () => buildBusinessKpiTable(allKpi, opts.currentStart, opts.currentEnd),
    [allKpi, opts.currentStart, opts.currentEnd],
  )

  return { kpiCards, optInData, dailyCombo, top10, funnel, dailyRevenue, bizKpiTable }
}
