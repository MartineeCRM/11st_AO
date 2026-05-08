import { useState, useMemo } from 'react'
import type { DashboardLayout, LayoutSection, SectionId } from '@/lib/supabase'

export type TabKey = 'performance' | 'attribution' | 'ops'

export const SECTION_LABELS: Record<SectionId, string> = {
  // performance
  kpi_cards:        'KPI 요약 카드',
  send_combo:       '발송 추이 콤보차트',
  top10_bar:        '캠페인 Top 10',
  channel_table:    '채널별 성과 테이블',
  funnel:           '퍼널 차트',
  custom_events:    '커스텀 이벤트 추이',
  biz_kpi_table:    '비즈니스 KPI 테이블',
  opt_in:           '수신동의 카드',
  aov_revenue:      'AOV + Revenue 차트',
  revenue_reward:   '발송당 Revenue 차트',
  // attribution
  att_filter:       'Attribution 필터',
  att_summary:      'Attribution 요약 배너',
  att_trend:        '일자별 구매 지표 트렌드',
  att_kpi_cards:    '구매 지표 카드 (CVR ~ 유저당 제품주문수)',
  att_data_table:   '일자별 Attribution 상세 테이블',
  att_roi_table:    '캠페인별 Attribution ROI',
  att_event_metrics:'기타 이벤트 지표',
  // ops
  send_trend:       '발송량 & 반응 트렌드',
  live_table:       '라이브 캠페인 현황',
  trigger_cards:    'Action-Based 트리거 현황',
  scheduled_list:   'Scheduled 캠페인 타임라인',
}

export const DEFAULT_LAYOUT: DashboardLayout = {
  performance: [
    { id: 'kpi_cards',      visible: true },
    { id: 'send_combo',     visible: true },
    { id: 'top10_bar',      visible: true },
    { id: 'channel_table',  visible: true },
    { id: 'funnel',         visible: true },
    { id: 'custom_events',  visible: true },
    { id: 'biz_kpi_table',  visible: true },
    { id: 'opt_in',         visible: true },
    { id: 'aov_revenue',    visible: true },
    { id: 'revenue_reward', visible: true },
  ],
  attribution: [
    { id: 'att_filter',        visible: true },
    { id: 'att_summary',       visible: true },
    { id: 'att_trend',         visible: true },
    { id: 'att_kpi_cards',     visible: true },
    { id: 'att_data_table',    visible: true },
    { id: 'att_roi_table',     visible: true },
    { id: 'att_event_metrics', visible: true },
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
