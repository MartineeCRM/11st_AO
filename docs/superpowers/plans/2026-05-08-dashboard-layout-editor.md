# Dashboard Layout Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow per-project dashboard layout customization — hide/show individual sections and reorder them via drag-and-drop — with inline edit mode activated from each tab's header.

**Architecture:** Add `dashboard_layout` JSONB to Supabase `projects`. A `useDashboardLayout` hook manages layout state and Supabase persistence. `DraggableSectionWrapper` wraps each section with drag handle + visibility toggle using `@dnd-kit/sortable`. Each tab page activates inline edit mode showing an `EditModeBar` banner with Save/Cancel.

**Tech Stack:** React, TypeScript, Tailwind CSS, Supabase, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities

---

### Task 1: Install @dnd-kit and update Supabase types

**Files:**
- Modify: `src/lib/supabase.ts`
- Modify: `src/hooks/useProject.ts`

- [ ] **Step 1: Install @dnd-kit packages**

```bash
NODE_ENV=development npm install --include=dev @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: packages added to `node_modules`, `package.json` updated.

- [ ] **Step 2: Add `DashboardLayout` type and update `Project` interface in `src/lib/supabase.ts`**

Replace the entire file content:

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type SectionId =
  | 'kpi_cards' | 'trends_top10' | 'channel_table' | 'funnel_events' | 'table_optin' | 'revenue'
  | 'att_filter' | 'att_summary' | 'att_metrics'
  | 'send_trend' | 'live_table' | 'trigger_cards' | 'scheduled_list'

export interface LayoutSection {
  id: SectionId
  visible: boolean
}

export interface DashboardLayout {
  performance: LayoutSection[]
  attribution: LayoutSection[]
  ops: LayoutSection[]
}

export interface Project {
  id: string
  name: string
  spreadsheet_id: string
  chart_colors: string[]
  metric_definitions: { col: string; label: string }[]
  trigger_mappings: Record<string, string>
  dashboard_layout: DashboardLayout
}
```

- [ ] **Step 3: Update `useProject.ts` — add `dashboard_layout` to select query and `saveDashboardLayout` function**

Find the select line:
```ts
.select('id, name, chart_colors, metric_definitions, spreadsheet_id, trigger_mappings')
```
Replace with:
```ts
.select('id, name, chart_colors, metric_definitions, spreadsheet_id, trigger_mappings, dashboard_layout')
```

Add `saveDashboardLayout` to `ProjectState` interface:
```ts
saveDashboardLayout: (layout: DashboardLayout) => Promise<void>
```

Add import at top of file:
```ts
import type { Project, DashboardLayout } from '@/lib/supabase'
```

Add function inside `useProject` before `return`:
```ts
async function saveDashboardLayout(layout: DashboardLayout) {
  if (!project) return
  const { error } = await supabase
    .from('projects')
    .update({ dashboard_layout: layout })
    .eq('id', project.id)
  if (error) throw new Error(error.message)
  setProject(prev => prev ? { ...prev, dashboard_layout: layout } : prev)
  setAvailableProjects(prev =>
    prev.map(p => p.id === project.id ? { ...p, dashboard_layout: layout } : p)
  )
}
```

Add `saveDashboardLayout` to return statement:
```ts
return { project, projectId, loading, error, availableProjects, setProjectId, saveTriggerMappings, saveDashboardLayout }
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
NODE_ENV=development npm run type-check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/supabase.ts src/hooks/useProject.ts
git commit -m "feat: add dashboard_layout type, install @dnd-kit"
```

---

### Task 2: Create `useDashboardLayout` hook

**Files:**
- Create: `src/hooks/useDashboardLayout.ts`

- [ ] **Step 1: Create `src/hooks/useDashboardLayout.ts`**

```ts
import { useState, useMemo } from 'react'
import type { DashboardLayout, LayoutSection, SectionId } from '@/lib/supabase'

export type TabKey = 'performance' | 'attribution' | 'ops'

export const SECTION_LABELS: Record<SectionId, string> = {
  kpi_cards:      'KPI 요약 카드',
  trends_top10:   '발송 추이 & 캠페인 Top 10',
  channel_table:  '채널별 성과 테이블',
  funnel_events:  '퍼널 & 커스텀 이벤트',
  table_optin:    '비즈니스 지표 테이블 & 수신동의',
  revenue:        'Revenue 차트',
  att_filter:     'Attribution 필터',
  att_summary:    'Attribution 요약 배너',
  att_metrics:    'Attribution 지표 (구매/이벤트)',
  send_trend:     '발송량 & 반응 트렌드',
  live_table:     '라이브 캠페인 현황',
  trigger_cards:  'Action-Based 트리거 현황',
  scheduled_list: 'Scheduled 캠페인 타임라인',
}

export const DEFAULT_LAYOUT: DashboardLayout = {
  performance: [
    { id: 'kpi_cards',     visible: true },
    { id: 'trends_top10',  visible: true },
    { id: 'channel_table', visible: true },
    { id: 'funnel_events', visible: true },
    { id: 'table_optin',   visible: true },
    { id: 'revenue',       visible: true },
  ],
  attribution: [
    { id: 'att_filter',  visible: true },
    { id: 'att_summary', visible: true },
    { id: 'att_metrics', visible: true },
  ],
  ops: [
    { id: 'send_trend',      visible: true },
    { id: 'live_table',      visible: true },
    { id: 'trigger_cards',   visible: true },
    { id: 'scheduled_list',  visible: true },
  ],
}

function mergeWithDefault(saved: LayoutSection[], defaults: LayoutSection[]): LayoutSection[] {
  // Keep saved order/visibility; append any new default sections not in saved
  const savedIds = new Set(saved.map(s => s.id))
  const missing = defaults.filter(d => !savedIds.has(d.id))
  return [...saved, ...missing]
}

function resolveLayout(raw: Partial<DashboardLayout> | null | undefined): DashboardLayout {
  if (!raw || Object.keys(raw).length === 0) return DEFAULT_LAYOUT
  return {
    performance: raw.performance ? mergeWithDefault(raw.performance, DEFAULT_LAYOUT.performance) : DEFAULT_LAYOUT.performance,
    attribution: raw.attribution ? mergeWithDefault(raw.attribution, DEFAULT_LAYOUT.attribution) : DEFAULT_LAYOUT.attribution,
    ops:         raw.ops         ? mergeWithDefault(raw.ops,         DEFAULT_LAYOUT.ops)         : DEFAULT_LAYOUT.ops,
  }
}

interface UseDashboardLayoutResult {
  sections: LayoutSection[]
  isEditing: boolean
  startEditing: () => void
  cancelEditing: () => void
  reorder: (oldIndex: number, newIndex: number) => void
  toggleVisible: (id: SectionId) => void
  save: () => Promise<void>
  saving: boolean
  saveError: string | null
}

export function useDashboardLayout(
  tab: TabKey,
  savedLayout: Partial<DashboardLayout> | null | undefined,
  onSave: (layout: DashboardLayout) => Promise<void>,
): UseDashboardLayoutResult {
  const resolvedBase = useMemo(() => resolveLayout(savedLayout), [savedLayout])
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<DashboardLayout | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const sections = isEditing && draft ? draft[tab] : resolvedBase[tab]

  function startEditing() {
    setDraft(resolvedBase)
    setSaveError(null)
    setIsEditing(true)
  }

  function cancelEditing() {
    setDraft(null)
    setSaveError(null)
    setIsEditing(false)
  }

  function reorder(oldIndex: number, newIndex: number) {
    if (!draft) return
    const arr = [...draft[tab]]
    const [moved] = arr.splice(oldIndex, 1)
    arr.splice(newIndex, 0, moved)
    setDraft({ ...draft, [tab]: arr })
  }

  function toggleVisible(id: SectionId) {
    if (!draft) return
    setDraft({
      ...draft,
      [tab]: draft[tab].map(s => s.id === id ? { ...s, visible: !s.visible } : s),
    })
  }

  async function save() {
    if (!draft) return
    setSaving(true)
    setSaveError(null)
    try {
      await onSave(draft)
      setIsEditing(false)
      setDraft(null)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return { sections, isEditing, startEditing, cancelEditing, reorder, toggleVisible, save, saving, saveError }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
NODE_ENV=development npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useDashboardLayout.ts
git commit -m "feat: add useDashboardLayout hook"
```

---

### Task 3: Create `EditModeBar` and `DraggableSectionWrapper` components

**Files:**
- Create: `src/components/EditModeBar.tsx`
- Create: `src/components/DraggableSectionWrapper.tsx`

- [ ] **Step 1: Create `src/components/EditModeBar.tsx`**

```tsx
import { Settings2 } from 'lucide-react'

interface Props {
  onSave: () => void
  onCancel: () => void
  saving: boolean
  saveError: string | null
}

export function EditModeBar({ onSave, onCancel, saving, saveError }: Props) {
  return (
    <div className="sticky top-14 z-40 flex items-center gap-3 px-6 py-2.5 bg-[#4361EE] shadow-md">
      <Settings2 className="h-4 w-4 text-white opacity-80" />
      <span className="text-sm font-semibold text-white flex-1">레이아웃 편집 중</span>
      {saveError && (
        <span className="text-xs text-red-200 mr-2">{saveError}</span>
      )}
      <button
        onClick={onCancel}
        className="rounded-lg px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10"
      >
        취소
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#4361EE] hover:bg-blue-50 disabled:opacity-50"
      >
        {saving ? '저장 중...' : '저장'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/DraggableSectionWrapper.tsx`**

```tsx
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Eye, EyeOff } from 'lucide-react'
import type { SectionId } from '@/lib/supabase'
import { SECTION_LABELS } from '@/hooks/useDashboardLayout'

interface Props {
  id: SectionId
  visible: boolean
  isEditing: boolean
  onToggleVisible: () => void
  children: React.ReactNode
}

export function DraggableSectionWrapper({ id, visible, isEditing, onToggleVisible, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Normal mode: hidden section renders nothing
  if (!isEditing && !visible) return null

  if (!isEditing) return <>{children}</>

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-xl border-2 transition-colors ${
        visible ? 'border-[#4361EE]/30' : 'border-[#E5E7EB] opacity-50'
      }`}
    >
      {/* Edit mode toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F9FAFB] border-b border-[#E5E7EB] rounded-t-xl">
        <button
          className="text-[#9CA3AF] hover:text-[#374151] cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>
        <span className="flex-1 text-xs font-medium text-[#374151]">
          {SECTION_LABELS[id]}
        </span>
        <button
          onClick={onToggleVisible}
          className={`rounded p-0.5 transition-colors ${
            visible
              ? 'text-[#4361EE] hover:bg-[#EEF2FF]'
              : 'text-[#9CA3AF] hover:bg-[#F3F4F6]'
          }`}
          title={visible ? '숨기기' : '표시하기'}
        >
          {visible ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
      </div>

      {/* Section content — dimmed if hidden */}
      {visible ? (
        <div className="pointer-events-none select-none">{children}</div>
      ) : (
        <div className="h-16 flex items-center justify-center">
          <span className="text-xs text-[#9CA3AF]">숨겨진 섹션</span>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
NODE_ENV=development npm run type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/EditModeBar.tsx src/components/DraggableSectionWrapper.tsx
git commit -m "feat: add EditModeBar and DraggableSectionWrapper components"
```

---

### Task 4: Wire layout editor into `CRMPerformance`

**Files:**
- Modify: `src/pages/CRMPerformance.tsx`

- [ ] **Step 1: Update `CRMPerformance.tsx`**

Replace the entire file:

```tsx
import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Settings2 } from 'lucide-react'
import { FilterBar } from '@/components/filters/FilterBar'
import { Row1KpiSummary } from '@/components/rows/Row1KpiSummary'
import { Row2TrendsTop10 } from '@/components/rows/Row2TrendsTop10'
import { Row3FunnelEvents } from '@/components/rows/Row3FunnelEvents'
import { Row4TableOptIn } from '@/components/rows/Row4TableOptIn'
import { Row5RevenueCharts } from '@/components/rows/Row5RevenueCharts'
import { ChannelPerformanceTable } from '@/components/charts/ChannelPerformanceTable'
import { EditModeBar } from '@/components/EditModeBar'
import { DraggableSectionWrapper } from '@/components/DraggableSectionWrapper'
import { useSheetData } from '@/hooks/useSheetData'
import { useFilteredData } from '@/hooks/useFilteredData'
import { useMetrics } from '@/hooks/useMetrics'
import { useAuth } from '@/hooks/useAuth'
import { useProject } from '@/hooks/useProject'
import { useDashboardLayout } from '@/hooks/useDashboardLayout'
import type { FilterState } from '@/types/sheets'
import type { Top10Metric } from '@/types/metrics'
import type { FunnelFieldKey } from '@/lib/metrics'
import type { SectionId } from '@/lib/supabase'
import { presetToRange, type Preset } from '@/components/filters/datePresets'

const DEFAULT_FUNNEL_STEPS: FunnelFieldKey[] = ['dau', 'purchase_cnt']
const DEFAULT_TOP10_METRIC: Top10Metric = 'Revenue'
const DEFAULT_PRESET: Preset = '30d'

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl border border-[#E5E7EB] bg-[#F3F4F6] ${className ?? ''}`} />
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-6 py-4">
      <div className="flex gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonCard key={i} className="flex-1 h-24" />
        ))}
      </div>
      <div className="flex gap-4">
        <SkeletonCard className="flex-[53] h-64" />
        <SkeletonCard className="flex-[43] h-64" />
      </div>
      <div className="flex gap-4">
        <SkeletonCard className="flex-[35] h-52" />
        <SkeletonCard className="flex-[61] h-52" />
      </div>
      <div className="flex gap-4">
        <SkeletonCard className="flex-[64] h-52" />
        <SkeletonCard className="flex-[33] h-52" />
      </div>
      <div className="flex gap-4">
        <SkeletonCard className="flex-1 h-48" />
        <SkeletonCard className="flex-1 h-48" />
      </div>
    </div>
  )
}

const SECTION_COMPONENTS: Record<SectionId, React.ReactNode | null> = {} as Record<SectionId, React.ReactNode | null>

export function CRMPerformance() {
  const { martinee, kpi, loading, error, dateRange } = useSheetData()
  const { user } = useAuth()
  const { project, saveDashboardLayout } = useProject(user?.id ?? null)

  const minDate = dateRange?.min ?? ''
  const maxDate = dateRange?.max ?? ''

  const [activePreset, setActivePreset] = useState<Preset | null>(DEFAULT_PRESET)
  const [filters, setFilters] = useState<FilterState>({
    dateRange: { start: '', end: '' },
    campaignDepth1: [],
    os: [],
  })

  useEffect(() => {
    if (maxDate && filters.dateRange.start === '' && filters.dateRange.end === '') {
      const range = presetToRange(DEFAULT_PRESET, maxDate)
      setFilters(f => ({ ...f, dateRange: range }))
    }
  }, [maxDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const [top10Metric, setTop10Metric] = useState<Top10Metric>(DEFAULT_TOP10_METRIC)
  const [funnelSteps, setFunnelSteps] = useState<FunnelFieldKey[]>(DEFAULT_FUNNEL_STEPS)

  const { filteredMartinee, filteredKpi, campaignDepth1Options, osOptions } = useFilteredData(martinee, kpi, filters)

  const currentStart = filters.dateRange.start || minDate
  const currentEnd = filters.dateRange.end || maxDate

  const { kpiCards, optInData, dailyCombo, top10, funnel, dailyRevenue, bizKpiTable } = useMetrics(
    filteredMartinee, filteredKpi, martinee, kpi,
    { top10Metric, funnelSteps, currentStart, currentEnd },
  )

  const { sections, isEditing, startEditing, cancelEditing, reorder, toggleVisible, save, saving, saveError } =
    useDashboardLayout('performance', project?.dashboard_layout, saveDashboardLayout)

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

  const sectionContent: Record<string, React.ReactNode> = {
    kpi_cards:     <Row1KpiSummary kpiCards={kpiCards} />,
    trends_top10:  <Row2TrendsTop10 dailyCombo={dailyCombo} top10={top10} top10Metric={top10Metric} onTop10MetricChange={setTop10Metric} />,
    channel_table: <div className="px-6 pb-4"><ChannelPerformanceTable rows={filteredMartinee} /></div>,
    funnel_events: <Row3FunnelEvents funnel={funnel} funnelSteps={funnelSteps} onFunnelStepsChange={setFunnelSteps} kpiRows={filteredKpi} />,
    table_optin:   <Row4TableOptIn bizKpiTable={bizKpiTable} optInData={optInData} />,
    revenue:       <Row5RevenueCharts dailyRevenue={dailyRevenue} />,
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-sm font-semibold text-[#EF4444]">데이터 로드 실패</p>
        <p className="text-xs text-[#6B7280]">{error}</p>
        <p className="text-xs text-[#9CA3AF]">.env 파일에 VITE_SPREADSHEET_ID와 VITE_GOOGLE_SHEETS_API_KEY를 확인하세요.</p>
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
        editButton={
          !isEditing ? (
            <button
              onClick={startEditing}
              className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#374151] hover:bg-[#F9FAFB]"
            >
              <Settings2 size={12} />
              레이아웃 편집
            </button>
          ) : null
        }
      />

      {isEditing && (
        <EditModeBar onSave={save} onCancel={cancelEditing} saving={saving} saveError={saveError} />
      )}

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="pb-8">
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
            </div>
          </SortableContext>
        </DndContext>
      )}
    </>
  )
}
```

- [ ] **Step 2: Check if `FilterBar` accepts `editButton` prop — read the file**

```bash
head -30 /Users/gunheelee/crm_dashboard/src/components/filters/FilterBar.tsx
```

If `FilterBar` does NOT have an `editButton` prop, add it. Find the Props interface and add:
```ts
editButton?: React.ReactNode
```
Then render `{editButton}` at the end of the filter bar's right section (or after the filter row). If it already exists, skip this step.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
NODE_ENV=development npm run type-check
```

Expected: no errors. Fix any prop mismatches before proceeding.

- [ ] **Step 4: Commit**

```bash
git add src/pages/CRMPerformance.tsx src/components/filters/FilterBar.tsx
git commit -m "feat: add layout editor to CRMPerformance tab"
```

---

### Task 5: Wire layout editor into `CRMAttribution`

**Files:**
- Modify: `src/pages/CRMAttribution.tsx`

- [ ] **Step 1: Read the current full file**

```bash
cat /Users/gunheelee/crm_dashboard/src/pages/CRMAttribution.tsx
```

- [ ] **Step 2: Add layout editor to `CRMAttribution.tsx`**

Add these imports at the top:
```tsx
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Settings2 } from 'lucide-react'
import { EditModeBar } from '@/components/EditModeBar'
import { DraggableSectionWrapper } from '@/components/DraggableSectionWrapper'
import { useAuth } from '@/hooks/useAuth'
import { useProject } from '@/hooks/useProject'
import { useDashboardLayout } from '@/hooks/useDashboardLayout'
```

Inside the `CRMAttribution` function, after existing hooks, add:
```tsx
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
```

Build `sectionContent` map (read actual JSX currently in the return statement and move each section into the map):
```tsx
const sectionContent: Record<string, React.ReactNode> = {
  att_filter:  <AttributionFilterBar ... />,   // move from return
  att_summary: <AttributionSummaryBanner ... />, // move from return
  att_metrics: <> ... </>,                      // move purchase/event tabs section
}
```

Replace the return body with:
```tsx
return (
  <>
    {isEditing && (
      <EditModeBar onSave={save} onCancel={cancelEditing} saving={saving} saveError={saveError} />
    )}
    <div className="...existing wrapper classes...">
      {!isEditing && (
        <div className="flex justify-end px-6 pt-4">
          <button
            onClick={startEditing}
            className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#374151] hover:bg-[#F9FAFB]"
          >
            <Settings2 size={12} />
            레이아웃 편집
          </button>
        </div>
      )}
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
  </>
)
```

**Important:** Read the actual current JSX structure before editing. The pattern above shows structure — use the actual props/state variables from the file.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
NODE_ENV=development npm run type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/CRMAttribution.tsx
git commit -m "feat: add layout editor to CRMAttribution tab"
```

---

### Task 6: Wire layout editor into `CRMCampaignOps`

**Files:**
- Modify: `src/pages/CRMCampaignOps.tsx`

- [ ] **Step 1: Replace `src/pages/CRMCampaignOps.tsx`**

```tsx
import { useMemo } from 'react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Settings2 } from 'lucide-react'
import { useSheetData } from '@/hooks/useSheetData'
import { useBrazeCampaigns } from '@/hooks/useBrazeCampaigns'
import { useAuth } from '@/hooks/useAuth'
import { useProject } from '@/hooks/useProject'
import { useDashboardLayout } from '@/hooks/useDashboardLayout'
import { SendOpenTrendChart } from '@/components/charts/SendOpenTrendChart'
import { LiveCampaignTable } from '@/components/LiveCampaignTable'
import { TriggerEventCards } from '@/components/TriggerEventCards'
import { ScheduledCampaignList } from '@/components/ScheduledCampaignList'
import { EditModeBar } from '@/components/EditModeBar'
import { DraggableSectionWrapper } from '@/components/DraggableSectionWrapper'
import { buildDailyComboData } from '@/lib/metrics'

export function CRMCampaignOps() {
  const { martinee, loading: sheetLoading } = useSheetData()
  const { campaigns, loading: brazeLoading, error: brazeError } = useBrazeCampaigns()
  const { user } = useAuth()
  const { project, saveTriggerMappings, saveDashboardLayout } = useProject(user?.id ?? null)

  const trendData = useMemo(
    () => (sheetLoading ? [] : buildDailyComboData(martinee, 30)),
    [martinee, sheetLoading],
  )

  const { sections, isEditing, startEditing, cancelEditing, reorder, toggleVisible, save, saving, saveError } =
    useDashboardLayout('ops', project?.dashboard_layout, saveDashboardLayout)

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

  const triggerMappings = project?.trigger_mappings ?? {}

  const sectionContent: Record<string, React.ReactNode> = {
    send_trend: sheetLoading ? (
      <div className="h-72 mx-6 rounded-xl border border-[#E5E7EB] bg-[#F3F4F6] animate-pulse" />
    ) : (
      <div className="px-6"><SendOpenTrendChart data={trendData} /></div>
    ),
    live_table: (
      <div className="px-6">
        <LiveCampaignTable campaigns={campaigns} loading={brazeLoading} error={brazeError} />
      </div>
    ),
    trigger_cards: (
      <div className="px-6">
        <TriggerEventCards
          campaigns={campaigns}
          loading={brazeLoading}
          error={brazeError}
          triggerMappings={triggerMappings}
          onSaveMappings={saveTriggerMappings}
        />
      </div>
    ),
    scheduled_list: (
      <div className="px-6">
        <ScheduledCampaignList campaigns={campaigns} loading={brazeLoading} error={brazeError} />
      </div>
    ),
  }

  return (
    <>
      {isEditing && (
        <EditModeBar onSave={save} onCancel={cancelEditing} saving={saving} saveError={saveError} />
      )}

      <div className="flex justify-end px-6 pt-4">
        {!isEditing && (
          <button
            onClick={startEditing}
            className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#374151] hover:bg-[#F9FAFB]"
          >
            <Settings2 size={12} />
            레이아웃 편집
          </button>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-5 px-0 py-5">
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
          </div>
        </SortableContext>
      </DndContext>
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
NODE_ENV=development npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/CRMCampaignOps.tsx
git commit -m "feat: add layout editor to CRMCampaignOps tab"
```

---

### Task 7: Smoke test all three tabs

- [ ] **Step 1: Start dev server**

```bash
NODE_ENV=development npm run dev
```

- [ ] **Step 2: Test CRM 성과 모니터링 tab**

1. Click "레이아웃 편집" button — blue EditModeBar appears
2. Drag a section (e.g., Revenue 차트) above KPI 요약 카드 — order changes
3. Click eye icon on a section — section dims (shows "숨겨진 섹션")
4. Click 취소 — original layout restored
5. Repeat drag + toggle, click 저장 — layout saved, edit mode exits
6. Reload page — layout persists

- [ ] **Step 3: Test CRM Attribution tab**

Same flow — edit button → drag → toggle → save → reload.

- [ ] **Step 4: Test 캠페인 운영 현황 tab**

Same flow.

- [ ] **Step 5: Test multi-project**

Switch to a different project — verify it has its own independent layout (or default if never saved).

- [ ] **Step 6: Commit any fixes**

```bash
git add -p
git commit -m "fix: layout editor smoke test fixes"
```
