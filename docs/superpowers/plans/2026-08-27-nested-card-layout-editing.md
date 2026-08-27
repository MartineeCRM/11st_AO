# Nested Card Layout Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users reorder and hide individual cards *within* four already-reorderable dashboard blocks (KPI 요약 카드, 수신동의 카드, Attribution 구매 지표, Attribution 이벤트 지표), on top of the existing block-level 레이아웃 편집 feature.

**Architecture:** Extend the existing `dashboard_layout` JSONB shape with an optional `items: LayoutItem[]` array per `LayoutSection`. Add item-level `reorderItem`/`toggleItemVisible` methods to `useDashboardLayout`, mirroring its existing section-level `reorder`/`toggleVisible`. Each affected card row/grid gets its own `@dnd-kit` drag scope (`ItemSortableRow`) and each card gets a small overlay wrapper (`DraggableItemWrapper`) for the drag handle + eye toggle — both new, reusable across all four blocks. Two of the four blocks (Attribution 구매/이벤트 cards) are currently hardcoded JSX and must be refactored into data-driven `.map()`s before item ordering can apply.

**Tech Stack:** React + TypeScript, `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (already installed, no new deps), Supabase (`projects.dashboard_layout` JSONB column, already exists).

**Spec:** `docs/superpowers/specs/2026-08-27-nested-card-layout-editing-design.md`

## Global Constraints

- No test framework exists in this repo (`npm run type-check` / `npm run lint` are the only automated checks — confirmed via `package.json` scripts). Do not add vitest or any test runner as part of this plan. Each task's verification is: `npm run type-check`, `npm run lint`, and a throwaway Node/tsx sanity script under `scratch/` (this repo's established convention for one-off verification, see `scratch/test_date.ts`) for pure-logic tasks, plus a manual browser check via `npm run dev` for UI tasks. Delete scratch scripts after use — do not commit them.
- One correction vs. the spec: the spec calls `table_optin`'s card list a "row" — it's actually a **vertical stack** (`Row4TableOptIn.tsx:16`, `flex flex-col gap-3`). Task 3 below uses `verticalListSortingStrategy` for it, not horizontal. `kpi_cards` genuinely is a horizontal row (`flex gap-3`) and uses `horizontalListSortingStrategy`. Both Attribution grids use `rectSortingStrategy`.
- `DraggableSectionWrapper.tsx:61` wraps section content in `pointer-events-none` while a section is visible-and-editing. Every new item-level interactive element (drag handle, eye button) must explicitly set `pointer-events-auto` on its own wrapper to remain clickable inside that ancestor.
- Follow existing code style: Tailwind arbitrary-value hex colors matching the surrounding file (`#0066cc`, `#9CA3AF`, `#e0e0e0`, `#e8f0fb`, `#F9FAFB` — same palette used throughout), `cn()` from `@/lib/utils` for conditional classes, Korean UI copy.
- Commit after each task (all file changes for that task in one commit), following this repo's existing terse commit-message convention (no `Co-Authored-By` tag — see `CLAUDE.md` "Vercel 배포 시 Co-Authored-By 태그 제거" gotcha).

---

### Task 1: Data model — types + `useDashboardLayout` item support

**Files:**
- Modify: `src/lib/supabase.ts:8-31`
- Modify: `src/types/metrics.ts:1-13` (`KpiCardData`), `src/types/metrics.ts:52-59` (`OptInData`)
- Modify: `src/hooks/useMetrics.ts:102-176` (`kpiCards` literal), `src/hooks/useMetrics.ts:193-218` (`optInData` literal)
- Modify: `src/hooks/useDashboardLayout.ts` (whole file)

**Interfaces:**
- Produces: `LayoutItem { id: string; visible: boolean }`, `LayoutSection.items?: LayoutItem[]` (from `@/lib/supabase`)
- Produces: `KpiCardId` union, `KpiCardData.id: KpiCardId`; `OptInCardId` union, `OptInData.id: OptInCardId` (from `@/types/metrics`)
- Produces: `useDashboardLayout()` return value gains `reorderItem(sectionId: SectionId, oldIndex: number, newIndex: number): void` and `toggleItemVisible(sectionId: SectionId, itemId: string): void`
- Produces: `DEFAULT_ITEM_IDS: Partial<Record<SectionId, string[]>>` exported from `useDashboardLayout.ts` (used by Task 3/4/5 components to compute a fallback order when `items` is undefined — should not happen in practice once this task lands, but keeps components defensive)

- [ ] **Step 1: Add `LayoutItem` type and `items` field to `LayoutSection`**

Edit `src/lib/supabase.ts`, replacing lines 13-16:

```ts
export interface LayoutItem {
  id: string
  visible: boolean
}

export interface LayoutSection {
  id: SectionId
  visible: boolean
  items?: LayoutItem[]
}
```

- [ ] **Step 2: Add stable `id` unions to KPI card and opt-in card types**

Edit `src/types/metrics.ts`, replacing lines 1-13:

```ts
export type KpiCardId = 'push_opt_in' | 'dau' | 'mau' | 'revenue' | 'sent_impression' | 'ctr' | 'msg_per_user'

export interface KpiCardData {
  id: KpiCardId
  label: string
  value: number
  formattedValue: string
  wow: number           // ratio: 0.05 = +5%
  mom?: number | null   // ratio: month-over-month, null if insufficient data
  trendData: number[]   // 14-day daily values (oldest → newest)
  icon: string          // lucide icon name
  isRate?: boolean
  isCurrency?: boolean
  anomaly?: boolean     // true if WoW change exceeds anomaly threshold
  primary?: boolean     // renders larger in the KPI row
}
```

And replace lines 52-59 (`OptInData`):

```ts
export type OptInCardId = 'push_opt_in' | 'sms_opt_in' | 'kakao_opt_in'

export interface OptInData {
  id: OptInCardId
  label: string
  icon: string
  value: number
  wow: number
  trendData: { date: string; value: number }[]
  color: string
}
```

- [ ] **Step 3: Add matching `id` values to the `kpiCards` literal array**

In `src/hooks/useMetrics.ts`, replace the `return [...]` block at lines 102-175 (inside the `kpiCards` `useMemo`) with this exact content — only the 7 new `id:` lines are added, every other field is byte-for-byte identical to today:

```ts
    return [
      {
        id: 'push_opt_in',
        label: '푸시 수신동의',
        value: curPush,
        formattedValue: formatNumber(Math.round(curPush)),
        wow: wowPush,
        mom: momKpi.length > 0 ? calcWoW(curPush, momPush) : null,
        trendData: calcKpiTrend14d(allKpi, 'push_opt_in', endDate),
        icon: 'bell',
        anomaly: isAnomaly('push_opt_in', wowPush),
        primary: true,
      },
      {
        id: 'dau',
        label: 'DAU',
        value: curDAU,
        formattedValue: formatNumber(Math.round(curDAU)),
        wow: wowDAU,
        mom: momKpi.length > 0 ? calcWoW(curDAU, momDAU) : null,
        trendData: calcKpiTrend14d(allKpi, 'dau', endDate),
        icon: 'users',
        anomaly: isAnomaly('dau', wowDAU),
      },
      {
        id: 'mau',
        label: 'MAU',
        value: curMAU,
        formattedValue: formatNumber(curMAU),
        wow: calcWoW(curMAU, prevMAU),
        mom: momKpi.length > 0 ? calcWoW(curMAU, momMAU) : null,
        trendData: calcKpiTrend14d(allKpi, 'mau', endDate),
        icon: 'users',
      },
      {
        id: 'revenue',
        label: 'Revenue',
        value: curRev,
        formattedValue: `₩${formatNumber(curRev)}`,
        wow: wowRev,
        mom: momKpi.length > 0 ? calcWoW(curRev, momRev) : null,
        trendData: calcKpiTrend14d(allKpi, 'revenue', endDate),
        icon: 'circle-dollar-sign',
        isCurrency: true,
        anomaly: isAnomaly('revenue', wowRev),
        primary: true,
      },
      {
        id: 'sent_impression',
        label: '전체 발송/노출',
        value: curSI,
        formattedValue: formatNumber(curSI),
        wow: wowSI,
        mom: momMartinee.length > 0 ? calcWoW(curSI, momSI) : null,
        trendData: calcTrend14d(allMartinee, 'sentImpression', endDate),
        icon: 'send',
        anomaly: isAnomaly('sentImpression', wowSI),
      },
      {
        id: 'ctr',
        label: '전체 평균 CTR',
        value: curCTR,
        formattedValue: formatRate(curCTR),
        wow: wowCTR,
        mom: momMartinee.length > 0 ? calcWoW(curCTR, momCTR) : null,
        trendData: calcTrend14d(allMartinee, 'ctr', endDate),
        icon: 'mouse-pointer-click',
        isRate: true,
        anomaly: isAnomaly('ctr', wowCTR),
      },
      {
        id: 'msg_per_user',
        label: '유저당 메시지 수',
        value: curMsg,
        formattedValue: curMsg.toFixed(1),
        wow: wowMsg,
        mom: momMartinee.length > 0 ? calcWoW(curMsg, momMsg) : null,
        trendData: calcTrend14d(allMartinee, 'msgPerUser', endDate),
        icon: 'message-square',
      },
    ]
```

- [ ] **Step 4: Add matching `id` values to the `optInData` literal array**

Same file, replace the `return [...]` block at lines 193-218 (inside the `optInData` `useMemo`) with this exact content:

```ts
    return [
      {
        id: 'push_opt_in',
        label: '푸시 수신 동의',
        icon: 'bell-ring',
        value: curPush,
        wow: calcWoW(curPush, prevPushRow),
        trendData: calcKpiTrend14dWithDates(allKpi, 'push_opt_in', endDate),
        color: '#0066cc',
      },
      {
        id: 'sms_opt_in',
        label: 'SMS 수신 동의',
        icon: 'message-square',
        value: curSms,
        wow: calcWoW(curSms, prevSms),
        trendData: calcKpiTrend14dWithDates(allKpi, 'sms_opt_in', endDate),
        color: '#10B981',
      },
      {
        id: 'kakao_opt_in',
        label: '카카오 수신 동의',
        icon: 'message-circle',
        value: curKakao,
        wow: calcWoW(curKakao, prevKakao),
        trendData: calcKpiTrend14dWithDates(allKpi, 'kakao_opt_in', endDate),
        color: '#F59E0B',
      },
    ]
```

- [ ] **Step 5: Rewrite `useDashboardLayout.ts` with item-level support**

Replace the entire file `src/hooks/useDashboardLayout.ts`:

```ts
import { useState, useMemo } from 'react'
import type { DashboardLayout, LayoutItem, LayoutSection, SectionId, TabKey } from '@/lib/supabase'

export const SECTION_LABELS: Record<SectionId, string> = {
  kpi_cards:      'KPI 요약 카드',
  trends_top10:   '발송 추이 & 캠페인 Top 10',
  channel_table:  '채널별 성과 테이블',
  funnel_events:  '퍼널 & 커스텀 이벤트',
  table_optin:    '비즈니스 지표 테이블 & 수신동의',
  revenue:        'Revenue 차트',
  att_trend:      '발송&노출 / 오픈&클릭 / CTR 트렌드',
  att_filter:     'Attribution 필터',
  att_summary:    'Attribution 요약 배너',
  att_metrics:    'Attribution 지표 (구매/이벤트)',
  send_trend:     '발송량 & 반응 트렌드',
  live_table:     '라이브 캠페인 현황',
  trigger_cards:  'Action-Based 트리거 현황',
  scheduled_list: 'Scheduled 캠페인 타임라인',
}

// 카드 단위 순서/노출 편집을 지원하는 섹션만 등록. 값이 없는 섹션은 items 없이 그대로 렌더링됨.
export const DEFAULT_ITEM_IDS: Partial<Record<SectionId, string[]>> = {
  kpi_cards: ['push_opt_in', 'dau', 'mau', 'revenue', 'sent_impression', 'ctr', 'msg_per_user'],
  table_optin: ['push_opt_in', 'sms_opt_in', 'kakao_opt_in'],
  att_metrics: [
    // 구매 탭
    'user_cvr', 'purchase_count', 'revenue', 'aov', 'arppu', 'frequency', 'items_per_order', 'items_per_user',
    // 이벤트 탭 (라벨은 선택된 이벤트에 따라 동적, id는 지표 종류 기준으로 고정)
    'cvr', 'count', 'exposure_users',
  ],
}

function defaultItems(sectionId: SectionId): LayoutItem[] | undefined {
  const ids = DEFAULT_ITEM_IDS[sectionId]
  return ids ? ids.map(id => ({ id, visible: true })) : undefined
}

export const DEFAULT_LAYOUT: DashboardLayout = {
  performance: [
    { id: 'kpi_cards',     visible: true, items: defaultItems('kpi_cards') },
    { id: 'trends_top10',  visible: true },
    { id: 'channel_table', visible: true },
    { id: 'funnel_events', visible: true },
    { id: 'table_optin',   visible: true, items: defaultItems('table_optin') },
    { id: 'revenue',       visible: true },
  ],
  attribution: [
    { id: 'att_filter',  visible: true },
    { id: 'att_summary', visible: true },
    { id: 'att_trend',   visible: true },
    { id: 'att_metrics', visible: true, items: defaultItems('att_metrics') },
  ],
  ops: [
    { id: 'send_trend',      visible: true },
    { id: 'live_table',      visible: true },
    { id: 'trigger_cards',   visible: true },
    { id: 'scheduled_list',  visible: true },
  ],
  tabVisibility: { performance: true, attribution: true, ops: true },
}

function mergeItemsWithDefault(saved: LayoutItem[] | undefined, defaultIds: string[]): LayoutItem[] {
  const savedList = saved ?? []
  const savedIds = new Set(savedList.map(i => i.id))
  const kept = savedList.filter(i => defaultIds.includes(i.id))
  const missing = defaultIds.filter(id => !savedIds.has(id)).map(id => ({ id, visible: true }))
  return [...kept, ...missing]
}

function mergeWithDefault(saved: LayoutSection[], defaults: LayoutSection[]): LayoutSection[] {
  const savedIds = new Set(saved.map(s => s.id))
  const missing = defaults.filter(d => !savedIds.has(d.id))
  const merged = [...saved, ...missing]
  return merged.map(s => {
    const ids = DEFAULT_ITEM_IDS[s.id]
    if (!ids) return s
    return { ...s, items: mergeItemsWithDefault(s.items, ids) }
  })
}

export function resolveLayout(raw: Partial<DashboardLayout> | null | undefined): DashboardLayout {
  if (!raw || Object.keys(raw).length === 0) return DEFAULT_LAYOUT
  return {
    performance: raw.performance ? mergeWithDefault(raw.performance, DEFAULT_LAYOUT.performance) : DEFAULT_LAYOUT.performance,
    attribution: raw.attribution ? mergeWithDefault(raw.attribution, DEFAULT_LAYOUT.attribution) : DEFAULT_LAYOUT.attribution,
    ops:         raw.ops         ? mergeWithDefault(raw.ops,         DEFAULT_LAYOUT.ops)         : DEFAULT_LAYOUT.ops,
    tabVisibility: raw.tabVisibility ?? DEFAULT_LAYOUT.tabVisibility,
  }
}

interface UseDashboardLayoutResult {
  sections: LayoutSection[]
  isEditing: boolean
  startEditing: () => void
  cancelEditing: () => void
  reorder: (oldIndex: number, newIndex: number) => void
  toggleVisible: (id: SectionId) => void
  reorderItem: (sectionId: SectionId, oldIndex: number, newIndex: number) => void
  toggleItemVisible: (sectionId: SectionId, itemId: string) => void
  resetToDefault: () => void
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

  function reorderItem(sectionId: SectionId, oldIndex: number, newIndex: number) {
    if (!draft) return
    setDraft({
      ...draft,
      [tab]: draft[tab].map(s => {
        if (s.id !== sectionId || !s.items) return s
        const arr = [...s.items]
        const [moved] = arr.splice(oldIndex, 1)
        arr.splice(newIndex, 0, moved)
        return { ...s, items: arr }
      }),
    })
  }

  function toggleItemVisible(sectionId: SectionId, itemId: string) {
    if (!draft) return
    setDraft({
      ...draft,
      [tab]: draft[tab].map(s => {
        if (s.id !== sectionId || !s.items) return s
        return { ...s, items: s.items.map(i => i.id === itemId ? { ...i, visible: !i.visible } : i) }
      }),
    })
  }

  function resetToDefault() {
    setDraft(DEFAULT_LAYOUT)
    setSaveError(null)
    setIsEditing(true)
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

  return {
    sections, isEditing, startEditing, cancelEditing,
    reorder, toggleVisible, reorderItem, toggleItemVisible,
    resetToDefault, save, saving, saveError,
  }
}
```

- [ ] **Step 6: Type-check**

Run: `npm run type-check`
Expected: PASS. If `KpiCardData`/`OptInData` consumers elsewhere reference these types positionally (unlikely, TS is structural), fix any reported call sites.

- [ ] **Step 7: Sanity-check `resolveLayout`/merge logic with a throwaway script**

Create `scratch/verify_layout_merge.ts`:

```ts
import { resolveLayout, DEFAULT_ITEM_IDS } from '../src/hooks/useDashboardLayout'

// 1. brand-new project (no saved layout) — should get full default item lists
const fresh = resolveLayout(null)
console.log('fresh kpi_cards items:', fresh.performance.find(s => s.id === 'kpi_cards')?.items)
console.log('expected length:', DEFAULT_ITEM_IDS.kpi_cards?.length)

// 2. pre-existing saved layout with NO items key at all (today's real Supabase rows)
const legacy = resolveLayout({
  performance: [
    { id: 'kpi_cards', visible: true },
    { id: 'revenue', visible: false },
  ],
})
console.log('legacy kpi_cards items (should backfill all 7, visible:true):', legacy.performance.find(s => s.id === 'kpi_cards')?.items)
console.log('legacy revenue (should have no items key):', legacy.performance.find(s => s.id === 'revenue'))

// 3. saved layout with a partial custom item order/visibility + one now-removed id
const partial = resolveLayout({
  performance: [
    {
      id: 'kpi_cards',
      visible: true,
      items: [
        { id: 'msg_per_user', visible: true },
        { id: 'mau', visible: false },
        { id: 'some_removed_card', visible: true },
      ],
    },
  ],
})
console.log('partial kpi_cards items (msg_per_user first, mau hidden, removed_card gone, rest appended):', partial.performance.find(s => s.id === 'kpi_cards')?.items)
```

Run: `npx tsx scratch/verify_layout_merge.ts`
Expected output:
- `fresh` kpi_cards items: all 7 ids, `visible: true`, in `DEFAULT_ITEM_IDS.kpi_cards` order.
- `legacy` kpi_cards items: all 7 ids backfilled, `visible: true`. `legacy` revenue: `{id: 'revenue', visible: false}` with **no** `items` key.
- `partial` kpi_cards items: starts with `msg_per_user` (visible), then `mau` (hidden), then the remaining 5 default ids appended as visible — and `some_removed_card` must **not** appear anywhere in the output.

If any expectation doesn't match, fix `mergeWithDefault`/`mergeItemsWithDefault` before continuing.

- [ ] **Step 8: Delete the scratch script and commit**

```bash
rm scratch/verify_layout_merge.ts
git add src/lib/supabase.ts src/types/metrics.ts src/hooks/useMetrics.ts src/hooks/useDashboardLayout.ts
git commit -m "feat: 대시보드 레이아웃에 카드 단위 순서/노출 데이터 모델 추가"
```

---

### Task 2: Shared components — `DraggableItemWrapper` + `ItemSortableRow`

**Files:**
- Create: `src/components/DraggableItemWrapper.tsx`
- Create: `src/components/ItemSortableRow.tsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/utils` (already used in `src/components/cards/KpiCard.tsx:17`)
- Produces: `DraggableItemWrapper({ id: string, visible: boolean, isEditing: boolean, onToggleVisible: () => void, className?: string, children: ReactNode })`
- Produces: `ItemSortableRow({ ids: string[], strategy: 'horizontal' | 'vertical' | 'grid', onReorder: (oldIndex: number, newIndex: number) => void, className?: string, children: ReactNode })`

- [ ] **Step 1: Create `DraggableItemWrapper.tsx`**

```tsx
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  id: string
  visible: boolean
  isEditing: boolean
  onToggleVisible: () => void
  className?: string
  children: React.ReactNode
}

export function DraggableItemWrapper({ id, visible, isEditing, onToggleVisible, className, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  if (!isEditing) {
    if (!visible) return null
    return <>{children}</>
  }

  if (!visible) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'pointer-events-auto flex min-h-[80px] items-center justify-center rounded-[18px] border-2 border-dashed border-[#e0e0e0] bg-[#F9FAFB]',
          className,
        )}
      >
        <button
          onClick={onToggleVisible}
          className="flex items-center gap-1 rounded p-1 text-[10px] text-[#9CA3AF] hover:bg-[#F3F4F6]"
        >
          <EyeOff size={12} />
          숨김
        </button>
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style} className={cn('pointer-events-auto relative min-w-0', className)}>
      <div className="absolute -top-2 -right-2 z-10 flex items-center gap-0.5 rounded-full border border-[#e0e0e0] bg-white px-1 py-0.5 shadow-sm">
        <button
          className="cursor-grab p-0.5 text-[#9CA3AF] hover:text-[#1d1d1f] active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={12} />
        </button>
        <button
          onClick={onToggleVisible}
          className="rounded p-0.5 text-[#0066cc] hover:bg-[#e8f0fb]"
        >
          <Eye size={12} />
        </button>
      </div>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Create `ItemSortableRow.tsx`**

```tsx
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
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable'

type Strategy = 'horizontal' | 'vertical' | 'grid'

const STRATEGIES = {
  horizontal: horizontalListSortingStrategy,
  vertical: verticalListSortingStrategy,
  grid: rectSortingStrategy,
}

interface Props {
  ids: string[]
  strategy: Strategy
  onReorder: (oldIndex: number, newIndex: number) => void
  className?: string
  children: React.ReactNode
}

export function ItemSortableRow({ ids, strategy, onReorder, className, children }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return
    onReorder(oldIndex, newIndex)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={STRATEGIES[strategy]}>
        <div className={className}>{children}</div>
      </SortableContext>
    </DndContext>
  )
}
```

- [ ] **Step 3: Type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: PASS (these two files aren't imported anywhere yet, so this only checks they're internally well-typed).

- [ ] **Step 4: Commit**

```bash
git add src/components/DraggableItemWrapper.tsx src/components/ItemSortableRow.tsx
git commit -m "feat: 카드 단위 드래그 정렬/노출 토글 공용 컴포넌트 추가"
```

---

### Task 3: Wire KPI 요약 카드 + 수신동의 카드 (성과 모니터링 탭)

**Files:**
- Modify: `src/components/rows/Row1KpiSummary.tsx` (whole file)
- Modify: `src/components/rows/Row4TableOptIn.tsx` (whole file)
- Modify: `src/pages/CRMPerformance.tsx:147-148, 163-177`

**Interfaces:**
- Consumes: `DraggableItemWrapper`, `ItemSortableRow` (Task 2); `LayoutItem` (Task 1, from `@/lib/supabase`); `reorderItem`/`toggleItemVisible` (Task 1, from `useDashboardLayout`)

- [ ] **Step 1: Rewrite `Row1KpiSummary.tsx`**

```tsx
import { KpiCard } from '@/components/cards/KpiCard'
import { DraggableItemWrapper } from '@/components/DraggableItemWrapper'
import { ItemSortableRow } from '@/components/ItemSortableRow'
import type { KpiCardData } from '@/types/metrics'
import type { LayoutItem } from '@/lib/supabase'

interface Props {
  kpiCards: KpiCardData[]
  items?: LayoutItem[]
  isEditing: boolean
  onReorder: (oldIndex: number, newIndex: number) => void
  onToggleVisible: (id: string) => void
}

export function Row1KpiSummary({ kpiCards, items, isEditing, onReorder, onToggleVisible }: Props) {
  const byId = new Map(kpiCards.map(c => [c.id, c]))
  const order = items ?? kpiCards.map(c => ({ id: c.id, visible: true }))

  return (
    <ItemSortableRow
      ids={order.map(it => it.id)}
      strategy="horizontal"
      onReorder={onReorder}
      className="flex gap-3 px-6 py-4"
    >
      {order.map(it => {
        const card = byId.get(it.id)
        if (!card) return null
        return (
          <DraggableItemWrapper
            key={it.id}
            id={it.id}
            visible={it.visible}
            isEditing={isEditing}
            onToggleVisible={() => onToggleVisible(it.id)}
            className={card.primary ? 'flex-[1.6]' : 'flex-1'}
          >
            <KpiCard data={card} />
          </DraggableItemWrapper>
        )
      })}
    </ItemSortableRow>
  )
}
```

- [ ] **Step 2: Rewrite `Row4TableOptIn.tsx`**

```tsx
import { BusinessKpiTable } from '@/components/charts/BusinessKpiTable'
import { OptInCard } from '@/components/cards/OptInCard'
import { DraggableItemWrapper } from '@/components/DraggableItemWrapper'
import { ItemSortableRow } from '@/components/ItemSortableRow'
import type { BusinessKpiRow, OptInData } from '@/types/metrics'
import type { LayoutItem } from '@/lib/supabase'

interface Props {
  bizKpiTable: BusinessKpiRow[]
  optInData: OptInData[]
  items?: LayoutItem[]
  isEditing: boolean
  onReorder: (oldIndex: number, newIndex: number) => void
  onToggleVisible: (id: string) => void
}

export function Row4TableOptIn({ bizKpiTable, optInData, items, isEditing, onReorder, onToggleVisible }: Props) {
  const byId = new Map(optInData.map(d => [d.id, d]))
  const order = items ?? optInData.map(d => ({ id: d.id, visible: true }))

  return (
    <div className="flex gap-4 px-6 py-4" style={{ minHeight: 360 }}>
      <div className="flex-[64]">
        <BusinessKpiTable rows={bizKpiTable} />
      </div>
      <ItemSortableRow
        ids={order.map(it => it.id)}
        strategy="vertical"
        onReorder={onReorder}
        className="flex-[33] flex flex-col gap-3"
      >
        {order.map(it => {
          const card = byId.get(it.id)
          if (!card) return null
          return (
            <DraggableItemWrapper
              key={it.id}
              id={it.id}
              visible={it.visible}
              isEditing={isEditing}
              onToggleVisible={() => onToggleVisible(it.id)}
            >
              <OptInCard data={card} />
            </DraggableItemWrapper>
          )
        })}
      </ItemSortableRow>
    </div>
  )
}
```

- [ ] **Step 3: Wire `CRMPerformance.tsx`**

In `src/pages/CRMPerformance.tsx`, edit line 147-148 to also destructure the new hook methods:

```tsx
  const { sections, isEditing, startEditing, cancelEditing, reorder, toggleVisible, reorderItem, toggleItemVisible, save, saving, saveError } =
    useDashboardLayout('performance', project?.dashboard_layout, saveDashboardLayout)
```

Then edit the `sectionContent` map (lines 163-177) — replace the `kpi_cards` and `table_optin` lines:

```tsx
  const kpiSection = sections.find(s => s.id === 'kpi_cards')
  const optInSection = sections.find(s => s.id === 'table_optin')

  const sectionContent: Record<SectionId, React.ReactNode> = {
    kpi_cards: (
      <Row1KpiSummary
        kpiCards={kpiCards}
        items={kpiSection?.items}
        isEditing={isEditing}
        onReorder={(oldIndex, newIndex) => reorderItem('kpi_cards', oldIndex, newIndex)}
        onToggleVisible={id => toggleItemVisible('kpi_cards', id)}
      />
    ),
    trends_top10:   <Row2TrendsTop10 dailyCombo={dailyCombo} top10={top10} top10Metric={top10Metric} onTop10MetricChange={setTop10Metric} />,
    channel_table:  <div className="px-6 pb-4"><ChannelPerformanceTable rows={filteredMartinee} /></div>,
    funnel_events:  <Row3FunnelEvents funnel={funnel} funnelSteps={funnelSteps} onFunnelStepsChange={setFunnelSteps} kpiRows={filteredKpi} eventColumns={kpiEventColumns} />,
    table_optin: (
      <Row4TableOptIn
        bizKpiTable={bizKpiTable}
        optInData={optInData}
        items={optInSection?.items}
        isEditing={isEditing}
        onReorder={(oldIndex, newIndex) => reorderItem('table_optin', oldIndex, newIndex)}
        onToggleVisible={id => toggleItemVisible('table_optin', id)}
      />
    ),
    revenue:        <Row5RevenueCharts dailyRevenue={dailyRevenue} />,
    att_filter:     null,
    att_summary:    null,
    att_metrics:    null,
    send_trend:     null,
    live_table:     null,
    trigger_cards:  null,
    scheduled_list: null,
  }
```

(`kpiSection`/`optInSection` must be declared **before** `sectionContent`, right after the `useDashboardLayout` call — place them immediately above the existing `sensors`/`handleDragEnd` block or right below it, either is fine as long as they're above `sectionContent`.)

- [ ] **Step 4: Type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: PASS.

- [ ] **Step 5: Manual browser verification**

Run: `NODE_ENV=development npm run dev`, open the 성과 모니터링 tab (needs a valid `.env` with real or test Google Sheets credentials — if none is available locally, do this verification against the Vercel preview/production deploy instead after pushing).

Checklist:
- [ ] 레이아웃 편집 켜기 → KPI 카드 7개 각각에 드래그 손잡이 + 눈 아이콘이 카드 우상단에 뜬다.
- [ ] KPI 카드 하나를 드래그해서 순서를 바꾸면 즉시 반영된다 (편집모드 미리보기).
- [ ] MAU 카드의 눈 아이콘을 클릭하면 점선 테두리의 빈 자리로 바뀐다 (카드가 사라지지 않고 자리만 남음).
- [ ] 저장을 누르면 편집모드가 꺼지고, 숨긴 카드는 완전히 사라지고 순서 변경이 유지된다.
- [ ] 페이지를 새로고침해도 저장한 순서/노출 상태가 유지된다 (Supabase에 반영됐는지 확인).
- [ ] 수신동의 카드(3개, 세로 스택)에서도 위 항목을 동일하게 반복 확인한다.
- [ ] 취소를 누르면 편집 전 상태로 돌아간다.

- [ ] **Step 6: Commit**

```bash
git add src/components/rows/Row1KpiSummary.tsx src/components/rows/Row4TableOptIn.tsx src/pages/CRMPerformance.tsx
git commit -m "feat: 성과 모니터링 KPI/수신동의 카드에 카드 단위 순서·노출 편집 적용"
```

---

### Task 4: Attribution 구매 지표 카드 — 데이터 기반 리팩터링 + 연결

**Files:**
- Modify: `src/components/attribution/PurchaseMetricsSection.tsx` (whole file)
- Modify: `src/pages/CRMAttribution.tsx:79-80, 152-199`

**Interfaces:**
- Consumes: `DraggableItemWrapper`, `ItemSortableRow` (Task 2); `LayoutItem` (Task 1)
- Preserves existing behavior: the `user_cvr` card keeps its `subValue`/`subLabel` (count_cvr) — this is the one card that isn't a 1:1 mapping from `PURCHASE_METRIC_OPTIONS`.

- [ ] **Step 1: Rewrite `PurchaseMetricsSection.tsx`**

```tsx
import { MetricToggleGroup } from './MetricToggleGroup'
import { PurchaseTrendChart } from './AttributionTrendChart'
import { AttributionKpiCard } from './AttributionKpiCard'
import { PurchaseDataTable } from './PurchaseDataTable'
import { CampaignRoiTable } from './CampaignRoiTable'
import { DraggableItemWrapper } from '@/components/DraggableItemWrapper'
import { ItemSortableRow } from '@/components/ItemSortableRow'
import { formatKorean, formatRate, formatCurrency } from '@/lib/formatters'
import type { PurchaseMetricKey, PurchaseMetrics, KpiDelta, TrendPoint } from '@/hooks/useAttributionMetrics'
import type { AttDataRow } from '@/types/sheets'
import type { LayoutItem } from '@/lib/supabase'
import { ChartSectionNote } from '@/components/charts/ChartSectionNote'

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

function formatMetricValue(key: PurchaseMetricKey, value: number): string {
  switch (key) {
    case 'user_cvr':
    case 'count_cvr':
      return formatRate(value)
    case 'revenue':
      return formatKorean(value)
    case 'aov':
    case 'arppu':
      return formatCurrency(value)
    case 'frequency':
    case 'items_per_order':
    case 'items_per_user':
      return value.toFixed(2)
    case 'purchase_count':
      return formatKorean(value)
    default:
      return formatKorean(value)
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

interface Props {
  activeMetric: PurchaseMetricKey
  onMetricChange: (key: PurchaseMetricKey) => void
  trendData: TrendPoint[]
  current: PurchaseMetrics
  delta: Record<PurchaseMetricKey, KpiDelta>
  filteredRows: AttDataRow[]
  allRows?: AttDataRow[]
  items?: LayoutItem[]
  isEditing: boolean
  onReorder: (oldIndex: number, newIndex: number) => void
  onToggleVisible: (id: string) => void
}

export function PurchaseMetricsSection({
  activeMetric,
  onMetricChange,
  trendData,
  current,
  delta,
  filteredRows,
  allRows,
  items,
  isEditing,
  onReorder,
  onToggleVisible,
}: Props) {
  const formatter = (v: number) => formatMetricValue(activeMetric, v)

  const cardContent: Record<PurchaseMetricKey, React.ReactNode> = {
    user_cvr: (
      <AttributionKpiCard
        title="CVR"
        value={formatRate(current.user_cvr)}
        subValue={formatRate(current.count_cvr)}
        subLabel="건수 CVR"
        delta={delta.user_cvr}
        highlighted={activeMetric === 'user_cvr'}
      />
    ),
    count_cvr: null, // count_cvr은 독립 카드가 아니라 user_cvr 카드의 subValue로만 표시됨
    purchase_count: (
      <AttributionKpiCard
        title="Purchase"
        value={formatKorean(current.purchase_count)}
        delta={delta.purchase_count}
        highlighted={activeMetric === 'purchase_count'}
      />
    ),
    revenue: (
      <AttributionKpiCard
        title="Revenue"
        value={formatKorean(current.revenue)}
        delta={delta.revenue}
        highlighted={activeMetric === 'revenue'}
      />
    ),
    aov: (
      <AttributionKpiCard
        title="AOV"
        value={formatCurrency(current.aov)}
        delta={delta.aov}
        highlighted={activeMetric === 'aov'}
      />
    ),
    arppu: (
      <AttributionKpiCard
        title="ARPPU"
        value={formatCurrency(current.arppu)}
        delta={delta.arppu}
        highlighted={activeMetric === 'arppu'}
      />
    ),
    frequency: (
      <AttributionKpiCard
        title="Frequency"
        value={current.frequency.toFixed(2)}
        delta={delta.frequency}
        highlighted={activeMetric === 'frequency'}
      />
    ),
    items_per_order: (
      <AttributionKpiCard
        title="주문당 제품수"
        value={current.items_per_order.toFixed(2)}
        delta={delta.items_per_order}
        highlighted={activeMetric === 'items_per_order'}
      />
    ),
    items_per_user: (
      <AttributionKpiCard
        title="유저당 제품주문수"
        value={current.items_per_user.toFixed(2)}
        delta={delta.items_per_user}
        highlighted={activeMetric === 'items_per_user'}
      />
    ),
  }

  const order = items ?? PURCHASE_METRIC_OPTIONS.map(o => ({ id: o.key, visible: true }))

  return (
    <div className="flex flex-col gap-4">
      <MetricToggleGroup
        options={PURCHASE_METRIC_OPTIONS}
        active={activeMetric}
        onChange={onMetricChange}
      />

      <div className="rounded-xl border border-[#e0e0e0] bg-white p-4">
        <div className="mb-3">
          <ChartSectionNote sectionId="att_purchase_trend" title="트렌드 (현재 / WoW / MoM)" titleClassName="text-xs font-semibold text-[#1d1d1f]" />
        </div>
        <PurchaseTrendChart
          data={trendData}
          yLabel={getYLabel(activeMetric)}
          formatter={formatter}
        />
      </div>

      <ItemSortableRow
        ids={order.map(it => it.id)}
        strategy="grid"
        onReorder={onReorder}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      >
        {order.map(it => {
          const content = cardContent[it.id as PurchaseMetricKey]
          if (!content) return null
          return (
            <DraggableItemWrapper
              key={it.id}
              id={it.id}
              visible={it.visible}
              isEditing={isEditing}
              onToggleVisible={() => onToggleVisible(it.id)}
            >
              {content}
            </DraggableItemWrapper>
          )
        })}
      </ItemSortableRow>

      <PurchaseDataTable rows={filteredRows} allRows={allRows} />
      <CampaignRoiTable rows={filteredRows} />
    </div>
  )
}
```

- [ ] **Step 2: Wire `CRMAttribution.tsx`**

Edit line 79-80 to destructure the new hook methods:

```tsx
  const { sections, isEditing, startEditing, cancelEditing, reorder, toggleVisible, reorderItem, toggleItemVisible, save, saving, saveError } =
    useDashboardLayout('attribution', project?.dashboard_layout, saveDashboardLayout)
```

Then, right before the `sectionContent` object (before line 123), add:

```tsx
  const attMetricsSection = sections.find(s => s.id === 'att_metrics')
```

Then edit the `PurchaseMetricsSection` usage inside `att_metrics` (lines 176-184):

```tsx
        {sectionTab === 'purchase' && (
          <PurchaseMetricsSection
            activeMetric={activeMetric}
            onMetricChange={setActiveMetric}
            trendData={trendData}
            current={kpis.current}
            delta={kpis.delta}
            filteredRows={filteredRows}
            allRows={extendedRows}
            items={attMetricsSection?.items}
            isEditing={isEditing}
            onReorder={(oldIndex, newIndex) => reorderItem('att_metrics', oldIndex, newIndex)}
            onToggleVisible={id => toggleItemVisible('att_metrics', id)}
          />
        )}
```

(Leave the `EventMetricsSection` call below it unchanged for now — Task 5 wires that one.)

- [ ] **Step 3: Type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: PASS. Watch for a TS error on `cardContent[it.id as PurchaseMetricKey]` if `it.id` isn't narrowed — the `as PurchaseMetricKey` cast is intentional here since `items` is stored as generic `string` ids at the type level but this component only ever receives the 8 purchase keys (plus 3 event keys it silently ignores via the `if (!content) return null` guard, since `count`/`cvr`/`exposure_users` aren't keys of `cardContent` and indexing with them returns `undefined`).

- [ ] **Step 4: Manual browser verification**

Same dev-server approach as Task 3.

Checklist:
- [ ] Attribution 탭 → 레이아웃 편집 켜기 → 구매 지표 탭 카드 8개 각각에 드래그 손잡이 + 눈 아이콘이 뜬다.
- [ ] Revenue 카드를 드래그해서 맨 왼쪽으로 옮기면 즉시 반영된다.
- [ ] 주문당 제품수 카드의 눈 아이콘을 클릭하면 숨겨진다.
- [ ] CVR 카드는 여전히 건수 CVR 서브값이 정상 표시된다 (리팩터링으로 안 깨졌는지 확인).
- [ ] 저장 후 새로고침해도 유지된다.

- [ ] **Step 5: Commit**

```bash
git add src/components/attribution/PurchaseMetricsSection.tsx src/pages/CRMAttribution.tsx
git commit -m "feat: Attribution 구매 지표 카드를 데이터 기반으로 리팩터링하고 카드 단위 편집 연결"
```

---

### Task 5: Attribution 이벤트 지표 카드 — 데이터 기반 리팩터링 + 연결

**Files:**
- Modify: `src/components/attribution/EventMetricsSection.tsx` (whole file)
- Modify: `src/pages/CRMAttribution.tsx:186-197`

**Interfaces:**
- Consumes: `DraggableItemWrapper`, `ItemSortableRow` (Task 2); `attMetricsSection` (declared in Task 4, Step 2 — already in scope in `CRMAttribution.tsx` by the time this task runs)
- Card ids are fixed (`cvr`, `count`, `exposure_users`) but labels stay dynamic per `activeEvent` — this is the one block where id and label diverge, per the spec.

- [ ] **Step 1: Rewrite `EventMetricsSection.tsx`**

```tsx
import { MetricToggleGroup } from './MetricToggleGroup'
import { EventTrendChart } from './AttributionTrendChart'
import { DraggableItemWrapper } from '@/components/DraggableItemWrapper'
import { ItemSortableRow } from '@/components/ItemSortableRow'
import { formatKorean } from '@/lib/formatters'
import type { EventTrendPoint } from '@/hooks/useAttributionMetrics'
import type { LayoutItem } from '@/lib/supabase'
import { ChartSectionNote } from '@/components/charts/ChartSectionNote'

function formatAdaptiveRate(v: number): string {
  const pct = v * 100
  if (pct === 0) return '0.00%'
  const decimals = pct < 0.001 ? 6 : pct < 0.01 ? 5 : pct < 0.1 ? 4 : pct < 1 ? 3 : 2
  return `${pct.toFixed(decimals)}%`
}

type EventCardId = 'cvr' | 'count' | 'exposure_users'

interface Props {
  activeEvent: string
  onEventChange: (key: string) => void
  eventCvr: number
  eventRawCount: number
  eventImpression: number
  eventTrend: EventTrendPoint[]
  availableEvents: string[]
  items?: LayoutItem[]
  isEditing: boolean
  onReorder: (oldIndex: number, newIndex: number) => void
  onToggleVisible: (id: string) => void
}

export function EventMetricsSection({
  activeEvent,
  onEventChange,
  eventCvr,
  eventRawCount,
  eventImpression,
  eventTrend,
  availableEvents,
  items,
  isEditing,
  onReorder,
  onToggleVisible,
}: Props) {
  const options = availableEvents.map(k => ({ key: k, label: k }))

  if (options.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-[#9CA3AF]">
        기타 이벤트 데이터가 없습니다.
      </div>
    )
  }

  const activeLabel = activeEvent

  const cardContent: Record<EventCardId, React.ReactNode> = {
    cvr: (
      <div className="rounded-xl border border-[#e0e0e0] bg-white px-4 py-3">
        <p className="text-[11px] text-[#9CA3AF]">{activeLabel} CVR</p>
        <p className="text-xl font-bold text-[#1d1d1f]">{formatAdaptiveRate(eventCvr)}</p>
        <p className="mt-0.5 text-[10px] text-[#9CA3AF]">이벤트 수 ÷ 노출+발송 유저</p>
      </div>
    ),
    count: (
      <div className="rounded-xl border border-[#e0e0e0] bg-white px-4 py-3">
        <p className="text-[11px] text-[#9CA3AF]">{activeLabel} 발생수</p>
        <p className="text-xl font-bold text-[#1d1d1f]">{formatKorean(eventRawCount)}</p>
        <p className="mt-0.5 text-[10px] text-[#9CA3AF]">기간 내 이벤트 합계</p>
      </div>
    ),
    exposure_users: (
      <div className="rounded-xl border border-[#e0e0e0] bg-white px-4 py-3">
        <p className="text-[11px] text-[#9CA3AF]">노출+발송 유저</p>
        <p className="text-xl font-bold text-[#1d1d1f]">{formatKorean(eventImpression)}</p>
        <p className="mt-0.5 text-[10px] text-[#9CA3AF]">IMPRESSION_OR_SEND_USER</p>
      </div>
    ),
  }

  const DEFAULT_EVENT_ITEM_IDS: EventCardId[] = ['cvr', 'count', 'exposure_users']
  const order = items ?? DEFAULT_EVENT_ITEM_IDS.map(id => ({ id, visible: true }))

  return (
    <div className="flex flex-col gap-4">
      <MetricToggleGroup
        options={options}
        active={activeEvent}
        onChange={onEventChange}
      />

      <div className="rounded-xl border border-[#e0e0e0] bg-white p-4">
        <div className="mb-3">
          <ChartSectionNote sectionId="att_event_trend" title={`${activeLabel} 발생수 트렌드`} titleClassName="text-xs font-semibold text-[#1d1d1f]" />
        </div>
        <EventTrendChart data={eventTrend} eventLabel={activeLabel} />
      </div>

      <ItemSortableRow
        ids={order.map(it => it.id)}
        strategy="grid"
        onReorder={onReorder}
        className="grid grid-cols-3 gap-3"
      >
        {order.map(it => {
          const content = cardContent[it.id as EventCardId]
          if (!content) return null
          return (
            <DraggableItemWrapper
              key={it.id}
              id={it.id}
              visible={it.visible}
              isEditing={isEditing}
              onToggleVisible={() => onToggleVisible(it.id)}
            >
              {content}
            </DraggableItemWrapper>
          )
        })}
      </ItemSortableRow>
    </div>
  )
}
```

- [ ] **Step 2: Wire `CRMAttribution.tsx`**

Edit the `EventMetricsSection` usage (lines 187-197 in the original, already shifted slightly by Task 4's edit — find it via the `sectionTab === 'event'` conditional):

```tsx
        {sectionTab === 'event' && (
          <EventMetricsSection
            activeEvent={activeEvent}
            onEventChange={setActiveEvent}
            eventCvr={eventCvr}
            eventRawCount={eventRawCount}
            eventImpression={eventImpression}
            eventTrend={eventTrend}
            availableEvents={availableEvents}
            items={attMetricsSection?.items}
            isEditing={isEditing}
            onReorder={(oldIndex, newIndex) => reorderItem('att_metrics', oldIndex, newIndex)}
            onToggleVisible={id => toggleItemVisible('att_metrics', id)}
          />
        )}
```

- [ ] **Step 3: Type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: PASS.

- [ ] **Step 4: Manual browser verification**

Checklist:
- [ ] Attribution 탭 → 이벤트 지표 탭으로 전환 → 레이아웃 편집 켜기 → 카드 3개에 드래그 손잡이 + 눈 아이콘이 뜬다.
- [ ] 카드 순서를 바꾸면 반영된다.
- [ ] 이벤트 선택(MetricToggleGroup)을 바꿔도 카드 라벨(`{이벤트명} CVR` 등)은 정상적으로 갱신되면서, 카드 순서/숨김 상태는 유지된다 (id는 고정, 라벨만 동적이라는 스펙 요구사항 확인).
- [ ] 저장 후 새로고침해도 유지된다.
- [ ] 구매 탭으로 돌아가도 구매 탭 카드 상태(Task 4)는 그대로 유지돼 있다.

- [ ] **Step 5: Commit**

```bash
git add src/components/attribution/EventMetricsSection.tsx src/pages/CRMAttribution.tsx
git commit -m "feat: Attribution 이벤트 지표 카드를 데이터 기반으로 리팩터링하고 카드 단위 편집 연결"
```

---

### Task 6: 전체 통합 확인 및 스펙 대조

**Files:** None modified — verification-only task.

- [ ] **Step 1: Full type-check + lint pass**

Run: `npm run type-check && npm run lint`
Expected: PASS with zero errors across the whole repo (not just touched files).

- [ ] **Step 2: Production build**

Run: `NODE_ENV=development npm run build`
Expected: builds successfully, no new bundle warnings beyond the pre-existing chunk-size warning.

- [ ] **Step 3: Spec coverage cross-check**

Re-read `docs/superpowers/specs/2026-08-27-nested-card-layout-editing-design.md` section by section and confirm each requirement has a corresponding completed task:
- [ ] Data model (`LayoutItem`, `items?` on `LayoutSection`) — Task 1
- [ ] Merge-with-default for items — Task 1
- [ ] `DraggableItemWrapper` + `pointer-events-auto` override — Task 2
- [ ] `ItemSortableRow` with per-strategy sorting — Task 2
- [ ] KPI cards wired — Task 3
- [ ] 수신동의 cards wired — Task 3
- [ ] Attribution 구매 cards refactored + wired — Task 4
- [ ] Attribution 이벤트 cards refactored + wired — Task 5
- [ ] Both example scenarios from the original request work end to end:
  - [ ] KPI 카드에서 MAU 숨기고 유저당 메시지 수를 맨 왼쪽으로
  - [ ] Attribution 구매 지표에서 주문당 제품수 숨기고 Revenue를 맨 왼쪽으로

- [ ] **Step 4: Push**

```bash
git push origin main
```

(Each task's commit should already be pushed as it lands, per this repo's established workflow of pushing straight to `main` — this step is a final confirmation `git status`/`git log` shows everything landed, not a batch push held back until the end.)
