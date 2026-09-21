import { useEffect, useMemo, useRef, useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { useSheetData } from '@/hooks/useSheetData'
import { DatePresetFilter } from '@/components/filters/DatePresetFilter'
import { CampaignSelectFilter } from '@/components/filters/CampaignSelectFilter'
import { presetToRange, type Preset } from '@/components/filters/datePresets'
import { AoCampaignTrendChart } from '@/components/charts/AoCampaignTrendChart'
import { AoCampaignDailyTable } from '@/components/AoCampaignDailyTable'
import { AoMonthlyPerformanceTable } from '@/components/AoMonthlyPerformanceTable'
import { AoPeriodComparisonTable } from '@/components/AoPeriodComparisonTable'
import { SegmentedToggle } from '@/components/filters/SegmentedToggle'
import { filterAoRows, listAoCampaignNames, buildAoCampaignTrend, previousPeriodOfSameLength } from '@/lib/metrics'
import { generateDemoAoRows } from '@/lib/aoDemoData'
import { toDateStr } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { DateRange } from '@/types/sheets'

const DEFAULT_PRESET: Preset = '90d'

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-5 px-6 py-5">
      <div className="h-80 animate-pulse rounded-xl border border-[#e0e0e0] bg-[#F3F4F6]" />
      <div className="h-64 animate-pulse rounded-xl border border-[#e0e0e0] bg-[#F3F4F6]" />
    </div>
  )
}

export function CRMAlwaysOn() {
  const { martinee, loading, error, dateRange } = useSheetData()
  const minDate = dateRange?.min ?? ''
  const maxDate = dateRange?.max ?? ''

  const [activePreset, setActivePreset] = useState<Preset | null>(DEFAULT_PRESET)
  const [range, setRange] = useState<DateRange>({ start: '', end: '' })
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [granularity, setGranularity] = useState<'week' | 'month'>('week')
  const [demoMode, setDemoMode] = useState(false)
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

  const aoRows = useMemo(() => {
    const real = filterAoRows(martinee)
    if (!demoMode) return real
    // 화면 미리보기 전용 — 실제 시트/DB에는 쓰지 않고 브라우저 메모리에서만 합쳐서 보여줌
    return [...real, ...generateDemoAoRows(maxDate || toDateStr(new Date()))]
  }, [martinee, demoMode, maxDate])
  const campaignOptions = useMemo(() => listAoCampaignNames(aoRows), [aoRows])

  // 캠페인 목록 로드 후 기본값(가나다순 첫 캠페인) 선택
  useEffect(() => {
    if (!selectedCampaign && campaignOptions.length > 0) {
      setSelectedCampaign(campaignOptions[0])
    }
  }, [campaignOptions]) // eslint-disable-line react-hooks/exhaustive-deps

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
          options={campaignOptions}
          selected={selectedCampaign}
          onChange={setSelectedCampaign}
        />

        <button
          onClick={() => setDemoMode(v => !v)}
          className={cn(
            'ml-auto flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
            demoMode
              ? 'border-[#D97706] bg-[#FFFBEB] text-[#92400E]'
              : 'border-[#e0e0e0] bg-[#F9FAFB] text-[#6B7280] hover:text-[#1d1d1f]',
          )}
        >
          <FlaskConical size={12} />
          샘플 데이터 미리보기{demoMode ? ' 끄기' : ''}
        </button>
      </div>

      {demoMode && (
        <div className="border-b border-[#FDE68A] bg-[#FFFBEB] px-6 py-2 text-xs text-[#92400E]">
          샘플 데이터 미리보기 중 — 실제 Bucketstore 데이터가 아니며, 화면에만 표시되고 저장되지 않습니다.
        </div>
      )}

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="flex flex-col gap-8 px-6 py-5">
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
