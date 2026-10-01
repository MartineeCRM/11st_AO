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
import {
  buildAoCampaignTrend,
  buildAoCampaignAlerts,
  previousPeriodOfSameLength,
  listAoCampaignGroups,
  listAoCampaignVariants,
  campaignGroupsOf,
  type AoCampaignSelection,
} from '@/lib/metrics'
import type { AoPushRow, DateRange } from '@/types/sheets'
import type { NoteSaveStatus } from '@/hooks/useCampaignNotesState'

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
  monitoredCampaigns: string[]
  campaignNotes: {
    notes: Record<string, string>
    saveStatus: Record<string, NoteSaveStatus>
    saveNote: (campaign: string, note: string) => void
  }
}

export function CRMAlwaysOn({ sheetData, aoRows, monitoredCampaigns, campaignNotes }: Props) {
  const { loading, error, dateRange } = sheetData
  const minDate = dateRange?.min ?? ''
  const maxDate = dateRange?.max ?? ''

  const [activePreset, setActivePreset] = useState<Preset | null>(DEFAULT_PRESET)
  const [range, setRange] = useState<DateRange>({ start: '', end: '' })
  const [selection, setSelection] = useState<AoCampaignSelection>({ campaign: '', variant: null })
  const [noteDraft, setNoteDraft] = useState('')

  useEffect(() => {
    setNoteDraft(campaignNotes.notes[selection.campaign] ?? '')
  }, [selection.campaign, campaignNotes.notes])
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

  // 캠페인(캠페인명_분할) 목록. 모니터링 대상 베리언트가 하나라도 있는 캠페인을 드롭다운 맨 위로
  // (각 그룹 내에서는 가나다순 유지) — 기존 베리언트 단위 정렬 원칙을 캠페인 단위로 확장
  const campaignGroups = useMemo(() => listAoCampaignGroups(aoRows), [aoRows])

  const monitoredCampaignGroups = useMemo(
    () => campaignGroupsOf(aoRows, monitoredCampaigns),
    [aoRows, monitoredCampaigns],
  )

  const sortedCampaignGroups = useMemo(() => {
    const monitoredSet = new Set(monitoredCampaignGroups)
    const monitored = campaignGroups.filter(c => monitoredSet.has(c))
    const rest = campaignGroups.filter(c => !monitoredSet.has(c))
    return [...monitored, ...rest]
  }, [campaignGroups, monitoredCampaignGroups])

  // 캠페인 목록 로드 후 기본값(모니터링 대상 우선, 그다음 가나다순 첫 캠페인) 선택, 베리언트는 항상 "전체"
  useEffect(() => {
    if (!selection.campaign && sortedCampaignGroups.length > 0) {
      setSelection({ campaign: sortedCampaignGroups[0], variant: null })
    }
  }, [sortedCampaignGroups]) // eslint-disable-line react-hooks/exhaustive-deps

  // 선택된 캠페인에 속한 베리언트 목록 ("전체"는 드롭다운에 넘길 때 맨 앞에 추가)
  const campaignVariants = useMemo(
    () => listAoCampaignVariants(aoRows, selection.campaign),
    [aoRows, selection.campaign],
  )

  // 표시 라벨: 전체면 "캠페인명 (전체)", 특정 베리언트면 "캠페인명 · 베리언트명"
  const selectionLabel = selection.campaign
    ? selection.variant
      ? `${selection.campaign} · ${selection.variant}`
      : `${selection.campaign} (전체)`
    : ''

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
    () => (selection.campaign ? buildAoCampaignTrend(trendSourceRows, selection, granularity) : []),
    [trendSourceRows, selection, granularity],
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
          options={sortedCampaignGroups}
          selected={selection.campaign}
          onChange={campaign => setSelection({ campaign, variant: null })}
          monitoredCampaigns={monitoredCampaignGroups}
        />

        <CampaignSelectFilter
          label="베리언트"
          options={['전체', ...campaignVariants]}
          selected={selection.variant ?? '전체'}
          onChange={variant => setSelection(prev => ({ ...prev, variant: variant === '전체' ? null : variant }))}
          monitoredCampaigns={monitoredCampaigns}
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
            <div className="flex flex-col gap-1">
              <textarea
                value={noteDraft}
                onChange={e => setNoteDraft(e.target.value)}
                onBlur={() => {
                  if (
                    selection.campaign &&
                    (noteDraft !== (campaignNotes.notes[selection.campaign] ?? '') ||
                      campaignNotes.saveStatus[selection.campaign] === 'error')
                  ) {
                    campaignNotes.saveNote(selection.campaign, noteDraft)
                  }
                }}
                placeholder="이 캠페인 특이사항 메모..."
                rows={2}
                className="w-full resize-none rounded-lg border border-[#e0e0e0] px-3 py-2 text-xs text-[#1d1d1f] outline-none focus:border-[#0066cc]"
              />
              {campaignNotes.saveStatus[selection.campaign] === 'saved' && (
                <span className="text-[11px] text-[#9CA3AF]">저장됨</span>
              )}
              {campaignNotes.saveStatus[selection.campaign] === 'error' && (
                <span className="text-[11px] text-[#EF4444]">저장 실패, 다시 시도</span>
              )}
            </div>
            {trendView === 'chart' ? (
              <div className="h-80">
                <AoCampaignTrendChart
                  campaignName={selectionLabel}
                  data={trendData}
                  granularity={granularity}
                  onGranularityChange={setGranularity}
                />
              </div>
            ) : (
              <AoCampaignDailyTable rows={trendSourceRows} selection={selection} label={selectionLabel} />
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
