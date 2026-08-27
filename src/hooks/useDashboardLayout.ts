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
