import { useMemo } from 'react'
import type { AttDataRow } from '@/types/sheets'
import {
  sumRows,
  calcPurchaseMetrics,
  calcEventCvr,
  calcDelta,
  buildTrendData,
  buildEventTrendData,
  offsetDate,
  type PurchaseMetrics,
  type PurchaseMetricKey,
  type EventKey,
  type TrendPoint,
  type EventTrendPoint,
  type PeriodDelta,
} from '@/lib/attributionMetrics'

export type { PurchaseMetrics, PurchaseMetricKey, EventKey, TrendPoint, EventTrendPoint, PeriodDelta }

export interface KpiDelta {
  wow: number | null
  mom: number | null
}

export interface PurchaseKpis {
  current: PurchaseMetrics
  wow: PurchaseMetrics | null
  mom: PurchaseMetrics | null
  delta: Record<PurchaseMetricKey, KpiDelta>
}

export interface AttributionMetricsResult {
  kpis: PurchaseKpis
  trendData: TrendPoint[]
  eventCvr: number
  eventRawCount: number       // 이벤트 발생 수 (분모 확인용)
  eventImpression: number     // impression_or_send_user (분모)
  eventTrend: EventTrendPoint[]
}

export function useAttributionMetrics(
  filteredRows: AttDataRow[],
  extendedRows: AttDataRow[],
  startDate: string,
  endDate: string,
  activeMetric: PurchaseMetricKey,
  activeEvent: EventKey,
): AttributionMetricsResult {
  return useMemo(() => {
    const wowStart = offsetDate(startDate, -7)
    const wowEnd = offsetDate(endDate, -7)
    const momStart = offsetDate(startDate, -30)
    const momEnd = offsetDate(endDate, -30)

    const wowRows = extendedRows.filter(r => r.date >= wowStart && r.date <= wowEnd)
    const momRows = extendedRows.filter(r => r.date >= momStart && r.date <= momEnd)

    const curSums = sumRows(filteredRows)
    const wowSums = wowRows.length > 0 ? sumRows(wowRows) : null
    const momSums = momRows.length > 0 ? sumRows(momRows) : null

    const current = calcPurchaseMetrics(curSums)
    const wow = wowSums ? calcPurchaseMetrics(wowSums) : null
    const mom = momSums ? calcPurchaseMetrics(momSums) : null

    const metricKeys: PurchaseMetricKey[] = [
      'user_cvr', 'count_cvr', 'purchase_count', 'revenue',
      'aov', 'arppu', 'frequency', 'items_per_order', 'items_per_user',
    ]
    const delta = Object.fromEntries(
      metricKeys.map(k => [
        k,
        {
          wow: wow ? calcDelta(current[k], wow[k]) : null,
          mom: mom ? calcDelta(current[k], mom[k]) : null,
        },
      ]),
    ) as Record<PurchaseMetricKey, KpiDelta>

    const trendData = buildTrendData(extendedRows, activeMetric, startDate, endDate)
    const eventCvr = calcEventCvr(curSums, activeEvent)
    const eventRawCount = curSums[activeEvent]
    const eventImpression = curSums.impression_or_send_user
    const eventTrend = buildEventTrendData(filteredRows, activeEvent, startDate, endDate)

    return {
      kpis: { current, wow, mom, delta },
      trendData,
      eventCvr,
      eventRawCount,
      eventImpression,
      eventTrend,
    }
  }, [filteredRows, extendedRows, startDate, endDate, activeMetric, activeEvent])
}
