import { useEffect, useMemo, useRef, useState } from 'react'
import type { SheetData } from '@/hooks/useSheetData'
import { DatePresetFilter } from '@/components/filters/DatePresetFilter'
import { CampaignSelectFilter } from '@/components/filters/CampaignSelectFilter'
import { presetToRange, type Preset } from '@/components/filters/datePresets'
import { AoCampaignTrendChart } from '@/components/charts/AoCampaignTrendChart'
import { AoCampaignDailyTable } from '@/components/AoCampaignDailyTable'
import { AoMonthlyPerformanceTable } from '@/components/AoMonthlyPerformanceTable'
import { AoPeriodComparisonTable } from '@/components/AoPeriodComparisonTable'
import { AoAlertBanner } from '@/components/AoAlertBanner'
import { SegmentedToggle } from '@/components/filters/SegmentedToggle'
import { buildAoCampaignTrend, buildAoCampaignAlerts, previousPeriodOfSameLength } from '@/lib/metrics'
import type { AoPushRow, DateRange } from '@/types/sheets'

const DEFAULT_PRESET: Preset = '90d'

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-5 px-6 py-5">
      <div className="h-80 animate-pulse rounded-xl border border-[#e0e0e0] bg-[#F3F4F6]" />
      <div className="h-64 animate-pulse rounded-xl border border-[#e0e0e0] bg-[#F3F4F6]" />
    </div>
  )
}

interface Props {
  sheetData: SheetData
  aoRows: AoPushRow[]
  campaignOptions: string[]
  monitoredCampaigns: string[]
}

export function CRMAlwaysOn({ sheetData, aoRows, campaignOptions, monitoredCampaigns }: Props) {
  const { loading, error, dateRange } = sheetData
  const minDate = dateRange?.min ?? ''
  const maxDate = dateRange?.max ?? ''

  const [activePreset, setActivePreset] = useState<Preset | null>(DEFAULT_PRESET)
  const [range, setRange] = useState<DateRange>({ start: '', end: '' })
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('week')
  const [viewMode, setViewMode] = useState<'accumulated' | 'comparison'>('accumulated')
  const [trendView, setTrendView] = useState<'chart' | 'table'>('chart')
  const [periodB, setPeriodB] = useState<DateRange>({ start: '', end: '' }) // 기준 기간
  const [periodA, setPeriodA] = useState<DateRange>({ start: '', end: '' }) // 비교 기간
  const periodInitialized = useRef(false)

  // dateRange 로드 후 기본 프리셋(최근 3개월) 적용
  useEffect(() => {
    if (maxDate && range.start === '' && range.end === '') {
      setRange(presetToRange(DEFAULT_PRESET, maxDate))
    }
  }, [maxDate]) // eslint-disable-line react-hooks/exhaustive-deps

  // 상단 기간 필터와 무관하게, 항상 데이터에 존재하는 최신 주 vs 직전 주를 비교 (운영 모니터링 목적).
  // 설정 탭에서 사용자가 고른 캠페인만 대상 — 간헐적으로 몰아서 발송하는 캠페인은 전주 대비 비교가
  // 의미 없어서 기본적으로 대상에서 빠져있다.
  const alerts = useMemo(() => buildAoCampaignAlerts(aoRows, monitoredCampaigns), [aoRows, monitoredCampaigns])

  // 설정 탭에서 고른 모니터링 대상 캠페인을 드롭다운 맨 위로 (각 그룹 내에서는 가나다순 유지)
  const sortedCampaignOptions = useMemo(() => {
    const monitoredSet = new Set(monitoredCampaigns)
    const monitored = campaignOptions.filter(c => monitoredSet.has(c))
    const rest = campaignOptions.filter(c => !monitoredSet.has(c))
    return [...monitored, ...rest]
  }, [campaignOptions, monitoredCampaigns])

  // 캠페인 목록 로드 후 기본값(모니터링 대상 우선, 그다음 가나다순 첫 캠페인) 선택
  useEffect(() => {
    if (!selectedCampaign && sortedCampaignOptions.length > 0) {
      setSelectedCampaign(sortedCampaignOptions[0])
    }
  }, [sortedCampaignOptions]) // eslint-disable-line react-hooks/exhaustive-deps

  const start = range.start || minDate
  const end = range.end || maxDate

  // 기간 비교의 기본값 — 상단 필터 기간을 "기준 기간"으로, 그 직전 동일 길이 구간을 "비교 기간"으로 잡음
  // 이후엔 사용자가 두 기간을 독립적으로 자유롭게 바꿀 수 있음
  useEffect(() => {
    if (periodInitialized.current || !start || !end) return
    periodInitialized.current = true
    setPeriodB({ start, end })
    setPeriodA(previousPeriodOfSameLength(start, end))
  }, [start, end])

  const trendSourceRows = useMemo(
    () => aoRows.filter(r => (!start || r.date >= start) && (!end || r.date <= end)),
    [aoRows, start, end],
  )

  const trendData = useMemo(
    () => (selectedCampaign ? buildAoCampaignTrend(trendSourceRows, selectedCampaign, granularity) : []),
    [trendSourceRows, selectedCampaign, granularity],
  )

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-sm font-semibold text-[#EF4444]">데이터 로드 실패</p>
        <p className="text-xs text-[#6B7280]">{error}</p>
        <p className="text-xs text-[#9CA3AF]">설정 탭에서 Google Sheets 연결 정보를 확인해주세요.</p>
      </div>
    )
  }

  return (
    <>
      <div className="sticky top-14 z-30 flex items-center gap-3 border-b border-[#e0e0e0] bg-white px-6 py-3">
        <DatePresetFilter
          value={range}
          onChange={setRange}
          minDate={minDate}
          maxDate={maxDate}
          activePreset={activePreset}
          onPresetChange={setActivePreset}
        />

        <div className="h-7 w-px bg-[#e0e0e0]" />

        <CampaignSelectFilter
          label="캠페인"
          options={sortedCampaignOptions}
          selected={selectedCampaign}
          onChange={setSelectedCampaign}
        />
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="flex flex-col gap-8 px-6 py-5">
          <AoAlertBanner alerts={alerts} />

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-[#1d1d1f]">캠페인별 추이</h2>
              <SegmentedToggle
                value={trendView}
                onChange={setTrendView}
                options={[
                  { key: 'chart', label: '그래프' },
                  { key: 'table', label: '테이블' },
                ]}
              />
            </div>
            {trendView === 'chart' ? (
              <div className="h-80">
                <AoCampaignTrendChart
                  campaignName={selectedCampaign}
                  data={trendData}
                  granularity={granularity}
                  onGranularityChange={setGranularity}
                />
              </div>
            ) : (
              <AoCampaignDailyTable rows={trendSourceRows} campaign={selectedCampaign} />
            )}
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-[#1d1d1f]">월별 실적</h2>
              <SegmentedToggle
                value={viewMode}
                onChange={setViewMode}
                options={[
                  { key: 'accumulated', label: '누적 보기' },
                  { key: 'comparison', label: '기간 비교' },
                ]}
              />
            </div>

            {viewMode === 'accumulated' ? (
              <AoMonthlyPerformanceTable rows={aoRows} />
            ) : (
              <AoPeriodComparisonTable
                rows={aoRows}
                periodA={periodA}
                periodB={periodB}
                onPeriodAChange={setPeriodA}
                onPeriodBChange={setPeriodB}
              />
            )}
          </section>
        </div>
      )}
    </>
  )
}
