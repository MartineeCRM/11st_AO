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
