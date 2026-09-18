import { useEffect, useMemo, useState } from 'react'
import { useSheetData } from '@/hooks/useSheetData'
import { DatePresetFilter } from '@/components/filters/DatePresetFilter'
import { CampaignSelectFilter } from '@/components/filters/CampaignSelectFilter'
import { presetToRange, type Preset } from '@/components/filters/datePresets'
import { AoCampaignTrendChart } from '@/components/charts/AoCampaignTrendChart'
import { AoMonthlyPerformanceTable } from '@/components/AoMonthlyPerformanceTable'
import { filterAoRows, listAoCampaignNames, buildAoCampaignTrend } from '@/lib/metrics'
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

  // dateRange 로드 후 기본 프리셋(최근 3개월) 적용
  useEffect(() => {
    if (maxDate && range.start === '' && range.end === '') {
      setRange(presetToRange(DEFAULT_PRESET, maxDate))
    }
  }, [maxDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const aoRows = useMemo(() => filterAoRows(martinee), [martinee])
  const campaignOptions = useMemo(() => listAoCampaignNames(aoRows), [aoRows])

  // 캠페인 목록 로드 후 기본값(가나다순 첫 캠페인) 선택
  useEffect(() => {
    if (!selectedCampaign && campaignOptions.length > 0) {
      setSelectedCampaign(campaignOptions[0])
    }
  }, [campaignOptions]) // eslint-disable-line react-hooks/exhaustive-deps

  const start = range.start || minDate
  const end = range.end || maxDate

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
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="flex flex-col gap-8 px-6 py-5">
          <section className="flex flex-col gap-2">
            <h2 className="px-1 text-sm font-semibold text-[#1d1d1f]">캠페인별 추이</h2>
            <div className="h-80">
              <AoCampaignTrendChart
                campaignName={selectedCampaign}
                data={trendData}
                granularity={granularity}
                onGranularityChange={setGranularity}
              />
            </div>
          </section>

          <section className="flex flex-col gap-2 border-t border-[#e0e0e0] pt-8">
            <h2 className="px-1 text-sm font-semibold text-[#1d1d1f]">월별 실적 누적</h2>
            <AoMonthlyPerformanceTable rows={aoRows} />
          </section>
        </div>
      )}
    </>
  )
}
