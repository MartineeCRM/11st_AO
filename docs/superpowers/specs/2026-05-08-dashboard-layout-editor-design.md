# Dashboard Layout Editor — Design Spec

**Date:** 2026-05-08  
**Status:** Approved

---

## Problem

All projects share the same fixed dashboard layout. Some projects need fewer or differently ordered charts. There is no way to hide irrelevant sections or reorder them per project.

## Solution

Add an inline edit mode to each tab. Users click a "레이아웃 편집" button in the tab header, which activates a drag-and-drop reordering + visibility toggle mode over the actual dashboard. Changes are saved explicitly (Save / Cancel) to `projects.dashboard_layout` in Supabase and shared across all project members.

---

## UX Flow

1. Each tab (성과 모니터링, Attribution, 운영 현황) has a **⚙ 레이아웃 편집** button in the top-right of the tab content area.
2. Clicking it activates **edit mode**:
   - A fixed blue banner appears at the top of the tab with **저장** and **취소** buttons.
   - Each chart/section gets a **drag handle (⠿)** on the left and an **eye icon (👁/👁‍🗨)** on the right.
   - Sections are draggable vertically within the tab using `@dnd-kit/sortable`.
   - Clicking the eye icon toggles `visible` on/off. Hidden sections show as a dimmed placeholder in edit mode (so they can be re-enabled), and are fully absent in normal mode.
3. **Save**: writes the new layout to Supabase → exits edit mode → tab re-renders with new order/visibility.
4. **Cancel**: reverts to the layout from before edit mode was entered → exits edit mode.

---

## Drag Unit

Individual chart sections (not full rows). Each named section in the layout config is independently draggable and toggleable. When a section is hidden, the remaining sections expand to fill the space (flex layout).

Sections within a two-column row (e.g., trends + Top10) are treated as a single section unit for drag purposes — the internal left/right split is fixed. This keeps the layout system simple while still allowing meaningful reordering.

---

## Data Storage

Add `dashboard_layout` JSONB column to the `projects` table:

```sql
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS dashboard_layout JSONB NOT NULL DEFAULT '{}';
```

Also add UPDATE RLS policy (same pattern as trigger_mappings):

```sql
CREATE POLICY "members can update own projects"
ON projects FOR UPDATE
USING (id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()))
WITH CHECK (id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));
```

Note: This UPDATE policy may already exist from the trigger_mappings work. Run `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'projects'` to check before adding.

### Schema

```ts
type SectionId =
  // performance tab
  | 'kpi_cards' | 'trends_top10' | 'channel_table' | 'funnel_events' | 'table_optin' | 'revenue'
  // attribution tab
  | 'att_filter' | 'att_summary' | 'att_metrics'
  // ops tab
  | 'send_trend' | 'live_table' | 'trigger_cards' | 'scheduled_list'

interface LayoutSection {
  id: SectionId
  visible: boolean
}

interface DashboardLayout {
  performance: LayoutSection[]
  attribution: LayoutSection[]
  ops: LayoutSection[]
}
```

If `dashboard_layout` is `{}` (default), fall back to the hardcoded default order with all sections visible.

---

## Default Layouts

```ts
const DEFAULT_LAYOUT: DashboardLayout = {
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
```

---

## Section Labels (shown in edit mode drag handles)

| id | 표시명 |
|---|---|
| kpi_cards | KPI 요약 카드 |
| trends_top10 | 발송 추이 & 캠페인 Top 10 |
| channel_table | 채널별 성과 테이블 |
| funnel_events | 퍼널 & 커스텀 이벤트 |
| table_optin | 비즈니스 지표 테이블 & 수신동의 |
| revenue | Revenue 차트 |
| att_filter | Attribution 필터 |
| att_summary | Attribution 요약 배너 |
| att_metrics | Attribution 지표 (구매/이벤트) |
| send_trend | 발송량 & 반응 트렌드 |
| live_table | 라이브 캠페인 현황 |
| trigger_cards | Action-Based 트리거 현황 |
| scheduled_list | Scheduled 캠페인 타임라인 |

---

## New Files

### `src/hooks/useDashboardLayout.ts`
- Reads `project.dashboard_layout`, merges with `DEFAULT_LAYOUT` (fills missing sections)
- Exposes: `layout: DashboardLayout`, `isEditing: boolean`, `draftLayout: DashboardLayout`
- Methods: `startEditing()`, `cancelEditing()`, `reorder(tab, oldIdx, newIdx)`, `toggleVisible(tab, id)`, `save(): Promise<void>`
- `save()` calls `saveDashboardLayout` from `useProject` and sets `isEditing = false`

### `src/components/DraggableSectionWrapper.tsx`
- Props: `id: string`, `label: string`, `visible: boolean`, `isEditing: boolean`, `onToggleVisible: () => void`, `children: ReactNode`
- In edit mode: renders drag handle (⠿), section label, eye toggle button, and wraps children with `@dnd-kit/sortable` `useSortable` hook
- Hidden sections in edit mode: render dimmed placeholder with label + eye button (no children)
- In normal mode: if `visible=false` renders nothing; otherwise renders children as-is

### `src/components/EditModeBar.tsx`
- Fixed top banner (blue, `z-50`) shown when `isEditing=true`
- Content: "레이아웃 편집 중" label + 저장 button + 취소 button
- Props: `onSave`, `onCancel`, `saving: boolean`

---

## Modified Files

### `src/lib/supabase.ts`
Add `dashboard_layout: DashboardLayout` to `Project` interface. Import `DashboardLayout` type.

### `src/hooks/useProject.ts`
- Add `dashboard_layout` to select query
- Add `saveDashboardLayout(layout: DashboardLayout): Promise<void>` (same pattern as `saveTriggerMappings`)
- Add to `ProjectState` interface and return value

### `src/pages/CRMPerformance.tsx`
- Use `useDashboardLayout('performance')`
- Wrap each section with `<DraggableSectionWrapper>`
- Wrap sortable sections in `<DndContext>` + `<SortableContext>` from `@dnd-kit`
- Show `<EditModeBar>` when editing
- Show "레이아웃 편집" button in tab header area

### `src/pages/CRMAttribution.tsx`
Same pattern, tab key `'attribution'`, 3 sections.

### `src/pages/CRMCampaignOps.tsx`
Same pattern, tab key `'ops'`, 4 sections.

---

## Dependencies

Add to `package.json`:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## Error Handling

- Save failure: show inline error in `EditModeBar`, stay in edit mode
- If `dashboard_layout` column missing from Supabase response: fall back to `DEFAULT_LAYOUT` silently

---

## Out of Scope

- Per-user layout (project-level only)
- Resizing chart heights
- Adding new chart types
- Reordering within a two-column row's internal left/right split
