import { useState, useEffect } from 'react'
import { FilterBar } from '@/components/filters/FilterBar'
import { Row1KpiSummary } from '@/components/rows/Row1KpiSummary'
import { Row2TrendsTop10 } from '@/components/rows/Row2TrendsTop10'
import { Row3FunnelEvents } from '@/components/rows/Row3FunnelEvents'
import { Row4TableOptIn } from '@/components/rows/Row4TableOptIn'
import { Row5RevenueCharts } from '@/components/rows/Row5RevenueCharts'
import { ChannelPerformanceTable } from '@/components/charts/ChannelPerformanceTable'
import { useSheetData } from '@/hooks/useSheetData'
import { useFilteredData } from '@/hooks/useFilteredData'
import { useMetrics } from '@/hooks/useMetrics'
import type { FilterState } from '@/types/sheets'
import type { Top10Metric } from '@/types/metrics'
import type { FunnelFieldKey } from '@/lib/metrics'
import { presetToRange, type Preset } from '@/components/filters/datePresets'

const DEFAULT_FUNNEL_STEPS: FunnelFieldKey[] = ['dau', 'purchase_cnt']
const DEFAULT_TOP10_METRIC: Top10Metric = 'Revenue'
const DEFAULT_PRESET: Preset = '30d'

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl border border-[#E5E7EB] bg-[#F3F4F6] ${className ?? ''}`}
    />
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-6 py-4">
      {/* Row1 KPI 카드 스켈레톤 */}
      <div className="flex gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonCard key={i} className="flex-1 h-24" />
        ))}
      </div>
      {/* Row2 스켈레톤 */}
      <div className="flex gap-4">
        <SkeletonCard className="flex-[53] h-64" />
        <SkeletonCard className="flex-[43] h-64" />
      </div>
      {/* Row3 스켈레톤 */}
      <div className="flex gap-4">
        <SkeletonCard className="flex-[35] h-52" />
        <SkeletonCard className="flex-[61] h-52" />
      </div>
      {/* Row4 스켈레톤 */}
      <div className="flex gap-4">
        <SkeletonCard className="flex-[64] h-52" />
        <SkeletonCard className="flex-[33] h-52" />
      </div>
      {/* Row5 스켈레톤 */}
      <div className="flex gap-4">
        <SkeletonCard className="flex-1 h-48" />
        <SkeletonCard className="flex-1 h-48" />
      </div>
    </div>
  )
}

export function CRMPerformance() {
  const { martinee, kpi, loading, error, dateRange } = useSheetData()

  const minDate = dateRange?.min ?? ''
  const maxDate = dateRange?.max ?? ''

  // 필터 상태
  const [activePreset, setActivePreset] = useState<Preset | null>(DEFAULT_PRESET)
  const [filters, setFilters] = useState<FilterState>({
    dateRange: { start: '', end: '' },
    campaignDepth1: [],
    os: [],
  })

  // dateRange 로드 후 기본 프리셋 적용
  useEffect(() => {
    if (maxDate && filters.dateRange.start === '' && filters.dateRange.end === '') {
      const range = presetToRange(DEFAULT_PRESET, maxDate)
      setFilters(f => ({ ...f, dateRange: range }))
    }
  }, [maxDate]) // eslint-disable-line react-hooks/exhaustive-deps

  // Top10 상태
  const [top10Metric, setTop10Metric] = useState<Top10Metric>(DEFAULT_TOP10_METRIC)

  // 퍼널 단계 상태
  const [funnelSteps, setFunnelSteps] = useState<FunnelFieldKey[]>(DEFAULT_FUNNEL_STEPS)

  const { filteredMartinee, filteredKpi, campaignDepth1Options, osOptions } = useFilteredData(
    martinee,
    kpi,
    filters,
  )

  const currentStart = filters.dateRange.start || minDate
  const currentEnd = filters.dateRange.end || maxDate

  const { kpiCards, optInData, dailyCombo, top10, funnel, dailyRevenue, bizKpiTable } = useMetrics(
    filteredMartinee,
    filteredKpi,
    martinee,
    kpi,
    {
      top10Metric,
      funnelSteps,
      currentStart,
      currentEnd,
    },
  )

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-sm font-semibold text-[#EF4444]">데이터 로드 실패</p>
        <p className="text-xs text-[#6B7280]">{error}</p>
        <p className="text-xs text-[#9CA3AF]">
          .env 파일에 VITE_SPREADSHEET_ID와 VITE_GOOGLE_SHEETS_API_KEY를 확인하세요.
        </p>
      </div>
    )
  }

  return (
    <>
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        campaignDepth1Options={campaignDepth1Options}
        osOptions={osOptions}
        minDate={minDate}
        maxDate={maxDate}
        activePreset={activePreset}
        onPresetChange={setActivePreset}
      />

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="pb-8">
          <Row1KpiSummary kpiCards={kpiCards} />
          <Row2TrendsTop10
            dailyCombo={dailyCombo}
            top10={top10}
            top10Metric={top10Metric}
            onTop10MetricChange={setTop10Metric}
          />
          <div className="px-6 pb-4">
            <ChannelPerformanceTable rows={filteredMartinee} />
          </div>
          <Row3FunnelEvents
            funnel={funnel}
            funnelSteps={funnelSteps}
            onFunnelStepsChange={setFunnelSteps}
            kpiRows={filteredKpi}
          />
          <Row4TableOptIn bizKpiTable={bizKpiTable} optInData={optInData} />
          <Row5RevenueCharts dailyRevenue={dailyRevenue} />
        </div>
      )}
    </>
  )
}
