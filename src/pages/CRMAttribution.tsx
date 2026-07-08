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
import { PurchaseMetricsSection } from '@/components/attribution/PurchaseMetricsSection'
import { EventMetricsSection } from '@/components/attribution/EventMetricsSection'
import type { Preset } from '@/components/filters/datePresets'
import { presetToRange } from '@/components/filters/datePresets'
import { EditModeBar } from '@/components/EditModeBar'
import { DraggableSectionWrapper } from '@/components/DraggableSectionWrapper'
import { useAuth } from '@/hooks/useAuth'
import { useProject } from '@/hooks/useProject'
import { useDashboardLayout } from '@/hooks/useDashboardLayout'
import { buildAttributionComboData } from '@/lib/metrics'
import { SendOpenTrendChart } from '@/components/charts/SendOpenTrendChart'

type SectionTab = 'purchase' | 'event'

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

  const [sectionTab, setSectionTab] = useState<SectionTab>('purchase')
  const [activeMetric, setActiveMetric] = useState<PurchaseMetricKey>('user_cvr')
  const [activeEvent, setActiveEvent] = useState<EventKey>('')

  // 데이터 로드 후 첫 번째 이벤트 자동 선택
  React.useEffect(() => {
    if (activeEvent === '' && filteredRows.length > 0) {
      const keys = Array.from(new Set(filteredRows.flatMap(r => Object.keys(r.extra_events)))).sort()
      if (keys.length > 0) setActiveEvent(keys[0])
    }
  }, [filteredRows, activeEvent])

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

  const { kpis, trendData, eventCvr, eventRawCount, eventImpression, eventTrend, availableEvents } = useAttributionMetrics(
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
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#0066cc] border-t-transparent" />
        <span className="ml-2 text-sm text-[#6B7280]">데이터 로딩 중...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="rounded-[18px] border border-red-100 bg-red-50 px-6 py-4 text-sm text-red-600">
          데이터 로드 실패: {error}
        </div>
      </div>
    )
  }

  const sectionContent: Record<string, React.ReactNode> = {
    att_trend: (
      <div className="px-6 pt-4">
        <SendOpenTrendChart data={buildAttributionComboData(filteredRows)} />
      </div>
    ),
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
    att_metrics: (
      <div className="px-6 py-5">
        {/* 섹션 탭 */}
        <div className="mb-5 flex gap-1 border-b border-[#e0e0e0]">
          {([
            { key: 'purchase', label: '구매 지표' },
            { key: 'event', label: '기타 이벤트' },
          ] as { key: SectionTab; label: string }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setSectionTab(tab.key)}
              className={[
                'px-4 py-2 text-sm font-medium transition-colors',
                sectionTab === tab.key
                  ? 'border-b-2 border-[#0066cc] text-[#0066cc]'
                  : 'text-[#6B7280] hover:text-[#1d1d1f]',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {sectionTab === 'purchase' && (
          <PurchaseMetricsSection
            activeMetric={activeMetric}
            onMetricChange={setActiveMetric}
            trendData={trendData}
            current={kpis.current}
            delta={kpis.delta}
            filteredRows={filteredRows}
            allRows={extendedRows}
          />
        )}

        {sectionTab === 'event' && (
          <EventMetricsSection
            activeEvent={activeEvent}
            onEventChange={setActiveEvent}
            eventCvr={eventCvr}
            eventRawCount={eventRawCount}
            eventImpression={eventImpression}
            eventTrend={eventTrend}
            availableEvents={availableEvents}
          />
        )}
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
            className="flex items-center gap-1.5 rounded-lg border border-[#e0e0e0] bg-white px-3 py-1.5 text-sm text-[#6B7280] hover:bg-[#F9FAFB]"
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
