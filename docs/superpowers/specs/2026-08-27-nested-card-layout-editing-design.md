# Nested Card Layout Editing — Design Spec

**Date:** 2026-08-27
**Status:** Draft

---

## Problem

The existing 레이아웃 편집 feature (`docs/superpowers/specs/2026-05-08-dashboard-layout-editor-design.md`) only reorders/hides *top-level* sections (`kpi_cards`, `att_metrics`, etc.). Several of those sections are themselves a row/grid of individual cards (KPI cards, opt-in cards, Attribution 구매/이벤트 metric cards), and there's no way to reorder or hide an individual card within a section — e.g. hide MAU inside KPI 요약 카드, or move Revenue to the leftmost slot inside Attribution 구매 지표.

## Solution

Extend `LayoutSection` with an optional `items: LayoutItem[]` array. When present, the section's own edit mode (already active via the existing `isEditing` flag) also renders drag handles + eye toggles on each individual card inside that section, using a second, section-scoped `@dnd-kit` drag context. Saved via the same Save/Cancel flow as today — one `dashboard_layout` write commits both section-level and item-level changes together.

Applies to 4 blocks across 2 tabs:

| Section id | Block | Item ids |
|---|---|---|
| `kpi_cards` | KPI 요약 카드 (성과 모니터링) | `push_opt_in, dau, mau, revenue, sent_impression, ctr, msg_per_user` |
| `table_optin` | 수신동의 카드 (성과 모니터링 Row4 우측) | `push_opt_in, sms_opt_in, kakao_opt_in` |
| `att_metrics` (구매 탭) | Attribution 구매 지표 카드 | reuses existing `PurchaseMetricKey`: `user_cvr, purchase_count, revenue, aov, arppu, frequency, items_per_order, items_per_user` |
| `att_metrics` (이벤트 탭) | Attribution 이벤트 지표 카드 | `cvr, count, exposure_users` (id is the metric *kind*; label stays dynamic per selected event) |

`att_metrics` carries item lists for **both** its purchase and event sub-tabs simultaneously (see Data Storage below) — the local `sectionTab` toggle only decides which list is currently rendered, not which is stored.

---

## UX Flow

1. No new entry point. Item-level controls appear automatically wherever a section with `items` is visible during the existing edit mode (레이아웃 편집 클릭 → 저장/취소 바 뜨는 상태).
2. Each card in an item-enabled section gets a small drag handle + eye icon overlay (visible only in edit mode), same visual language as `DraggableSectionWrapper`'s section-level controls but sized down for a card.
3. Dragging reorders cards within that section only — cards cannot be dragged out of their section or into a different section.
4. Eye toggle hides the card immediately in the edit-mode preview (dimmed placeholder, same convention as hidden sections) and removes it from the normal-mode render on Save.
5. Hiding every card in a section is allowed (section itself stays visible but renders an empty block) — no minimum-visible-card enforcement, consistent with how section-level hiding already has no "can't hide everything" guard.
6. Save/Cancel behavior unchanged — both section-order and item-order/visibility are part of the same `draft` object and commit together.

---

## Data Storage

No new table/column. Extends the existing `dashboard_layout` JSONB shape in place.

### Schema

```ts
interface LayoutItem {
  id: string
  visible: boolean
}

interface LayoutSection {
  id: SectionId
  visible: boolean
  items?: LayoutItem[]          // NEW — only present for sections with card-level layout
}

interface DashboardLayout {
  performance: LayoutSection[]
  attribution: LayoutSection[]
  ops: LayoutSection[]
  tabVisibility: TabVisibility
}
```

`att_metrics`'s `items` array is the **union** of purchase-tab ids and event-tab ids (they don't collide — see id lists above). Each consuming component filters to just the ids it recognizes and ignores the rest. This avoids adding a second nesting level (`items.purchase` / `items.event`) for one section, at the cost of the two id sets needing to stay disjoint (already true).

Since `sectionTab` (구매 / 이벤트) is a local, non-persisted UI toggle, only the currently-selected sub-tab's cards are mounted, so edit controls for the other sub-tab simply aren't visible until you switch to it — no special-casing needed, this falls out of the existing conditional render.

### Merge-with-default (extends existing `mergeWithDefault` in `useDashboardLayout.ts`)

Same append-missing-ids strategy used today for sections, applied one level down:
- For each section that has a `DEFAULT_ITEM_IDS[sectionId]` entry, merge saved `items` with the default id list — ids present in the default but missing from saved are appended as `visible: true`; saved ids no longer in the default are dropped (handles renamed/removed cards).
- Sections without a default item list (e.g. `revenue`, `trends_top10`) simply have no `items` key, unchanged from today.

---

## Default Item Layouts

```ts
const DEFAULT_ITEM_IDS: Partial<Record<SectionId, string[]>> = {
  kpi_cards: ['push_opt_in', 'dau', 'mau', 'revenue', 'sent_impression', 'ctr', 'msg_per_user'],
  table_optin: ['push_opt_in', 'sms_opt_in', 'kakao_opt_in'],
  att_metrics: [
    // purchase tab
    'user_cvr', 'purchase_count', 'revenue', 'aov', 'arppu', 'frequency', 'items_per_order', 'items_per_user',
    // event tab
    'cvr', 'count', 'exposure_users',
  ],
}
```

## Item Labels (edit-mode overlay + reference)

| Section | id | 표시명 |
|---|---|---|
| kpi_cards | push_opt_in | 푸시 수신동의 |
| kpi_cards | dau | DAU |
| kpi_cards | mau | MAU |
| kpi_cards | revenue | Revenue |
| kpi_cards | sent_impression | 전체 발송/노출 |
| kpi_cards | ctr | 전체 평균 CTR |
| kpi_cards | msg_per_user | 유저당 메시지 수 |
| table_optin | push_opt_in | 푸시 수신동의 |
| table_optin | sms_opt_in | SMS 수신동의 |
| table_optin | kakao_opt_in | 카카오 수신동의 |
| att_metrics | user_cvr | CVR |
| att_metrics | purchase_count | Purchase |
| att_metrics | revenue | Revenue |
| att_metrics | aov | AOV |
| att_metrics | arppu | ARPPU |
| att_metrics | frequency | Frequency |
| att_metrics | items_per_order | 주문당 제품수 |
| att_metrics | items_per_user | 유저당 제품주문수 |
| att_metrics | cvr | (선택 이벤트) CVR — 라벨 동적 |
| att_metrics | count | (선택 이벤트) 발생수 — 라벨 동적 |
| att_metrics | exposure_users | 노출+발송 유저 — 라벨 동적 |

`kpi_cards`/`table_optin` labels double as the existing Korean `label` field already in `useMetrics.ts` — no separate label map needed for those two; only `att_metrics`'s event-tab ids need a static fallback label since their real label is computed from `activeEvent` at render time.

---

## New Files

### `src/components/DraggableItemWrapper.tsx`
- Props: `id: string`, `visible: boolean`, `isEditing: boolean`, `onToggleVisible: () => void`, `children: ReactNode`
- Same responsibility as `DraggableSectionWrapper` but sized for a single card: small drag handle + eye icon rendered as an absolutely-positioned overlay in the card's corner (doesn't reflow card content), rather than a full header bar.
- Must render its controls with `pointer-events-auto` explicitly — `DraggableSectionWrapper` sets `pointer-events-none` on section content while editing (to block accidental clicks on inner links/buttons), and this wrapper's overlay sits inside that subtree, so it needs to opt back in.
- In edit mode + `visible=false`: renders a dimmed/hatched placeholder in the card's place (not just hidden), so it can be re-enabled via the eye icon — same convention as hidden sections.
- In normal mode: `visible=false` renders nothing; `visible=true` renders children unchanged.

### `src/components/ItemSortableRow.tsx` (or similar — thin wrapper)
- Owns one section's own `DndContext` + `SortableContext`, scoped to just that section's item ids.
- Picks `horizontalListSortingStrategy` for row layouts (kpi_cards, table_optin) vs `rectSortingStrategy` for grid layouts (att_metrics purchase/event card grids) — passed as a prop per call site, not auto-detected.
- `onDragEnd` translates `active.id`/`over.id` into an index-based call to the new `reorderItem(sectionId, oldIndex, newIndex)` hook method (see below).

---

## Modified Files

### `src/lib/supabase.ts`
Add `LayoutItem` interface; add optional `items?: LayoutItem[]` to `LayoutSection`.

### `src/hooks/useDashboardLayout.ts`
- Add `DEFAULT_ITEM_IDS` map and item-level label map (or reuse existing per-block label sources where already present).
- Extend `mergeWithDefault` to also merge each section's `items` against `DEFAULT_ITEM_IDS[section.id]` when present.
- New draft-mutating methods, mirroring the existing section-level ones:
  - `reorderItem(sectionId: SectionId, oldIndex: number, newIndex: number)`
  - `toggleItemVisible(sectionId: SectionId, itemId: string)`
- These operate on `draft[currentTab].find(s => s.id === sectionId).items`.

### `src/types/metrics.ts`
- Add `type KpiCardId = 'push_opt_in' | 'dau' | 'mau' | 'revenue' | 'sent_impression' | 'ctr' | 'msg_per_user'` and `id: KpiCardId` on `KpiCardData`.
- Add `type OptInCardId = 'push_opt_in' | 'sms_opt_in' | 'kakao_opt_in'` and `id: OptInCardId` on the opt-in card data type (confirm exact type name/location during implementation — same file or `types/sheets.ts`).

### `src/hooks/useMetrics.ts`
- Add the matching `id` value to each of the 7 literal KPI card objects and 3 literal opt-in card objects.
- Both arrays are then filtered/reordered by the consuming Row component according to `items` before rendering (array itself stays otherwise unchanged — this hook still computes raw values, ordering is applied downstream).

### `src/components/rows/Row1KpiSummary.tsx`
- Accepts `items: LayoutItem[]` (resolved) prop from `CRMPerformance.tsx`.
- Reorders/filters `kpiCards` by `items` before mapping.
- Wraps each `<KpiCard>` in `<DraggableItemWrapper>` inside an `<ItemSortableRow strategy="horizontal">`.

### `src/components/rows/Row4TableOptIn.tsx`
Same pattern as Row1KpiSummary, for the opt-in card list.

### `src/components/attribution/PurchaseMetricsSection.tsx`
- **Refactor the 8 hardcoded `<AttributionKpiCard>` elements (lines ~97-149) into a `.map()`** over `PURCHASE_METRIC_OPTIONS`-shaped data (already has `{key, label}` — extend with whatever value/delta lookup the hardcoded JSX currently does per key, likely a `Record<PurchaseMetricKey, {value, delta}>` built once above the map).
- Accepts `items: LayoutItem[]` prop, filters/reorders before mapping.
- Wraps each card in `<DraggableItemWrapper>` inside `<ItemSortableRow strategy="grid">`.

### `src/components/attribution/EventMetricsSection.tsx`
- **Refactor the 3 hardcoded cards (lines ~60-76) into a `.map()`** over a small local array of `{id: 'cvr'|'count'|'exposure_users', label: string, value, delta}` built from `activeEvent` + `activeLabel` at render time (label stays dynamic, id stays fixed).
- Accepts `items: LayoutItem[]` prop, filters/reorders before mapping.
- Wraps each card in `<DraggableItemWrapper>` inside `<ItemSortableRow strategy="grid">`.

### `src/pages/CRMPerformance.tsx`
- Pass `layout.performance.find(s => s.id === 'kpi_cards')?.items`, `isEditing`, and item-level callbacks down to `Row1KpiSummary` / `Row4TableOptIn`.

### `src/pages/CRMAttribution.tsx`
- Same, for `att_metrics`'s `items` passed to `PurchaseMetricsSection` / `EventMetricsSection`.

---

## Dependencies

None new — reuses `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` already installed.

---

## Error Handling

Same as existing section-level editor: save failure shows inline error in `EditModeBar`, stays in edit mode. No new failure modes introduced — item data lives in the same JSONB blob as section data, same single write.

---

## Out of Scope

- Per-user card layout (project-level only, same as sections)
- Dragging a card between two different sections
- Item-level layout for blocks not listed above (funnel steps, custom event line toggles, trigger cards) — these either already have their own non-persisted UI (funnel dropdown swap, event checkboxes) or weren't asked for; can be added later following this same pattern
- Enforcing at least one visible card per section
