import React, { useState, useMemo } from 'react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Settings2 } from 'lucide-react'
import { useAttributionData } from '@/hooks/useAttributionData'
import { useAttributionFiltered, type AttributionFilterState } from '@/hooks/useAttributionFiltered'
import { useAttributionMetrics, type PurchaseMetricKey, type EventKey } from '@/hooks/useAttributionMetrics'
import { AttributionFilterBar } from '@/components/attribution/AttributionFilterBar'
import { AttributionSummaryBanner } from '@/components/attribution/AttributionSummaryBanner'
import { MetricToggleGroup } from '@/components/attribution/MetricToggleGroup'
import { PurchaseTrendChart } from '@/components/attribution/AttributionTrendChart'
import { AttributionKpiCard } from '@/components/attribution/AttributionKpiCard'
import { PurchaseDataTable } from '@/components/attribution/PurchaseDataTable'
import { CampaignRoiTable } from '@/components/attribution/CampaignRoiTable'
import { EventMetricsSection } from '@/components/attribution/EventMetricsSection'
import { formatKorean, formatRate, formatCurrency } from '@/lib/formatters'
import type { Preset } from '@/components/filters/datePresets'
import { presetToRange } from '@/components/filters/datePresets'
import { EditModeBar } from '@/components/EditModeBar'
import { DraggableSectionWrapper } from '@/components/DraggableSectionWrapper'
import { useAuth } from '@/hooks/useAuth'
import { useProject } from '@/hooks/useProject'
import { useDashboardLayout } from '@/hooks/useDashboardLayout'

const PURCHASE_METRIC_OPTIONS: { key: PurchaseMetricKey; label: string }[] = [
  { key: 'user_cvr', label: 'CVR' },
  { key: 'purchase_count', label: 'Purchase' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'aov', label: 'AOV' },
  { key: 'arppu', label: 'ARPPU' },
  { key: 'frequency', label: 'Frequency' },
  { key: 'items_per_order', label: '주문당 제품수' },
  { key: 'items_per_user', label: '유저당 제품주문수' },
]

function formatMetricValue(key: PurchaseMetricKey, v: number): string {
  switch (key) {
    case 'user_cvr':
    case 'count_cvr': return formatRate(v)
    case 'revenue': return formatKorean(v)
    case 'aov':
    case 'arppu': return formatCurrency(v)
    default: return v.toFixed(2)
  }
}

function getYLabel(key: PurchaseMetricKey): string {
  switch (key) {
    case 'user_cvr': return 'CVR (%)'
    case 'purchase_count': return '구매수'
    case 'revenue': return '매출'
    case 'aov': return 'AOV'
    case 'arppu': return 'ARPPU'
    case 'frequency': return 'Frequency'
    case 'items_per_order': return '주문당제품'
    case 'items_per_user': return '유저당제품'
    default: return ''
  }
}

export function CRMAttribution() {
  const { rows, loading, error, dateRange } = useAttributionData()

  const minDate = dateRange?.min ?? ''
  const maxDate = dateRange?.max ?? ''

  const [activePreset, setActivePreset] = useState<Preset | null>('30d')
  const [filters, setFilters] = useState<AttributionFilterState>(() => {
    const today = new Date().toISOString().slice(0, 10)
    const thirtyDaysAgo = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)
    return {
      dateRange: { start: thirtyDaysAgo, end: today },
      sourceAlias: [],
      variantAlias: [],
      category: [],
      messageType: [],
      os: [],
    }
  })

  // 데이터가 로드되면 날짜 범위를 실제 데이터 기준으로 초기화
  const resolvedFilters = useMemo<AttributionFilterState>(() => {
    if (!minDate || !maxDate) return filters
    if (activePreset === '30d') {
      return { ...filters, dateRange: presetToRange('30d', maxDate) }
    }
    if (activePreset === '7d') {
      return { ...filters, dateRange: presetToRange('7d', maxDate) }
    }
    if (activePreset === 'all') {
      return { ...filters, dateRange: { start: minDate, end: maxDate } }
    }
    return filters
  }, [filters, activePreset, minDate, maxDate])

  const { filteredRows, extendedRows, filterOptions } = useAttributionFiltered(rows, resolvedFilters)

  const [activeMetric, setActiveMetric] = useState<PurchaseMetricKey>('user_cvr')
  const [activeEvent, setActiveEvent] = useState<EventKey>('add_to_cart')

  const { user } = useAuth()
  const { project, saveDashboardLayout } = useProject(user?.id ?? null)

  const { sections, isEditing, startEditing, cancelEditing, reorder, toggleVisible, save, saving, saveError } =
    useDashboardLayout('attribution', project?.dashboard_layout, saveDashboardLayout)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sections.findIndex(s => s.id === active.id)
    const newIndex = sections.findIndex(s => s.id === over.id)
    reorder(oldIndex, newIndex)
  }

  const { kpis, trendData, eventCvr, eventRawCount, eventImpression, eventTrend } = useAttributionMetrics(
    filteredRows,
    extendedRows,
    resolvedFilters.dateRange.start,
    resolvedFilters.dateRange.end,
    activeMetric,
    activeEvent,
  )

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#4361EE] border-t-transparent" />
        <span className="ml-2 text-sm text-[#6B7280]">데이터 로딩 중...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="rounded-xl border border-red-100 bg-red-50 px-6 py-4 text-sm text-red-600">
          데이터 로드 실패: {error}
        </div>
      </div>
    )
  }

  const formatter = (v: number) => formatMetricValue(activeMetric, v)

  const sectionContent: Partial<Record<string, React.ReactNode>> = {
    att_filter: (
      <AttributionFilterBar
        filters={resolvedFilters}
        onFiltersChange={f => {
          setFilters(f)
          setActivePreset(null)
        }}
        filterOptions={filterOptions}
        minDate={minDate}
        maxDate={maxDate}
        activePreset={activePreset}
        onPresetChange={p => {
          setActivePreset(p)
          if (p) setFilters(prev => ({ ...prev, dateRange: presetToRange(p, maxDate) }))
        }}
      />
    ),
    att_summary: (
      <AttributionSummaryBanner
        current={kpis.current}
        hasData={filteredRows.length > 0}
      />
    ),
    att_trend: (
      <div className="px-6 py-4">
        <MetricToggleGroup
          options={PURCHASE_METRIC_OPTIONS}
          active={activeMetric}
          onChange={setActiveMetric}
        />
        <div className="mt-4 rounded-xl border border-[#E5E7EB] bg-white p-4">
          <p className="mb-3 text-xs font-semibold text-[#374151]">트렌드 (현재 / WoW / MoM)</p>
          <PurchaseTrendChart
            data={trendData}
            yLabel={getYLabel(activeMetric)}
            formatter={formatter}
          />
        </div>
      </div>
    ),
    att_kpi_cards: (
      <div className="px-6 py-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <AttributionKpiCard title="CVR" value={formatRate(kpis.current.user_cvr)} subValue={formatRate(kpis.current.count_cvr)} subLabel="건수 CVR" delta={kpis.delta.user_cvr} highlighted={activeMetric === 'user_cvr'} />
        <AttributionKpiCard title="Purchase" value={formatKorean(kpis.current.purchase_count)} delta={kpis.delta.purchase_count} highlighted={activeMetric === 'purchase_count'} />
        <AttributionKpiCard title="Revenue" value={formatKorean(kpis.current.revenue)} delta={kpis.delta.revenue} highlighted={activeMetric === 'revenue'} />
        <AttributionKpiCard title="AOV" value={formatCurrency(kpis.current.aov)} delta={kpis.delta.aov} highlighted={activeMetric === 'aov'} />
        <AttributionKpiCard title="ARPPU" value={formatCurrency(kpis.current.arppu)} delta={kpis.delta.arppu} highlighted={activeMetric === 'arppu'} />
        <AttributionKpiCard title="Frequency" value={kpis.current.frequency.toFixed(2)} delta={kpis.delta.frequency} highlighted={activeMetric === 'frequency'} />
        <AttributionKpiCard title="주문당 제품수" value={kpis.current.items_per_order.toFixed(2)} delta={kpis.delta.items_per_order} highlighted={activeMetric === 'items_per_order'} />
        <AttributionKpiCard title="유저당 제품주문수" value={kpis.current.items_per_user.toFixed(2)} delta={kpis.delta.items_per_user} highlighted={activeMetric === 'items_per_user'} />
      </div>
    ),
    att_data_table: (
      <div className="px-6 py-4">
        <PurchaseDataTable rows={filteredRows} allRows={extendedRows} />
      </div>
    ),
    att_roi_table: (
      <div className="px-6 py-4">
        <CampaignRoiTable rows={filteredRows} />
      </div>
    ),
    att_event_metrics: (
      <div className="px-6 py-4">
        <EventMetricsSection
          activeEvent={activeEvent}
          onEventChange={setActiveEvent}
          eventCvr={eventCvr}
          eventRawCount={eventRawCount}
          eventImpression={eventImpression}
          eventTrend={eventTrend}
        />
      </div>
    ),
  }

  return (
    <div className="flex flex-col">
      {isEditing && (
        <EditModeBar onSave={save} onCancel={cancelEditing} saving={saving} saveError={saveError} />
      )}

      <div className="flex justify-end px-6 pt-4">
        {!isEditing ? (
          <button
            onClick={startEditing}
            className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-sm text-[#6B7280] hover:bg-[#F9FAFB]"
          >
            <Settings2 className="h-4 w-4" />
            레이아웃 편집
          </button>
        ) : null}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {sections.map(section => (
            <DraggableSectionWrapper
              key={section.id}
              id={section.id}
              visible={section.visible}
              isEditing={isEditing}
              onToggleVisible={() => toggleVisible(section.id)}
            >
              {sectionContent[section.id]}
            </DraggableSectionWrapper>
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}
