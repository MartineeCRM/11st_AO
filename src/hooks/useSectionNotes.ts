import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// section_id values — one per chart/section across all tabs
export type SectionId =
  // CRMPerformance
  | 'perf_daily_send'       // 일별 발송량/CTR/CVR 추이
  | 'perf_top10'            // 캠페인 성과 Top 10
  | 'perf_channel_table'    // 채널별 성과 테이블
  | 'perf_funnel'           // 전환 퍼널
  | 'perf_custom_event'     // 커스텀 이벤트 추이
  | 'perf_business_kpi'     // 비즈니스 지표 기간 비교
  | 'perf_revenue_reward'   // 발송당 Revenue/예상 Reward
  | 'perf_aov_revenue'      // Revenue/AOV 추이
  // CRMAttribution
  | 'att_purchase_table'    // 일자별 구매 지표
  | 'att_purchase_trend'    // 구매 트렌드 차트
  | 'att_event_trend'       // 이벤트 트렌드 차트
  // CRMCampaignOps
  | 'ops_send_trend'        // 발송량/반응 트렌드
  | 'ops_live_table'        // 라이브 캠페인
  | 'ops_trigger_cards'     // 트리거 이벤트
  | 'ops_scheduled_list'    // 예약 캠페인

export interface SectionNote {
  id: string
  section_id: SectionId
  note: string
  author_email: string | null
  updated_at: string
}

const PROJECT_KEY = 'crm_project_id'
const DATE_KEY = 'section' // sentinel value — reuses chart_notes.date column

function getProjectId(): string {
  return localStorage.getItem(PROJECT_KEY) ?? ''
}

export function useSectionNotes(sectionId: SectionId) {
  const [note, setNote] = useState<SectionNote | null>(null)
  const projectId = getProjectId()

  const load = useCallback(async () => {
    if (!projectId) return
    const { data } = await supabase
      .from('chart_notes')
      .select('id, note, author_email, updated_at')
      .eq('project_id', projectId)
      .eq('chart_type', sectionId)
      .eq('date', DATE_KEY)
      .maybeSingle()
    if (data) setNote({ ...data, section_id: sectionId } as SectionNote)
  }, [projectId, sectionId])

  useEffect(() => { load() }, [load])

  const saveNote = useCallback(async (text: string) => {
    if (!projectId) return
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      project_id: projectId,
      chart_type: sectionId,
      date: DATE_KEY,
      note: text,
      author_id: user?.id ?? null,
      author_email: user?.email ?? null,
      updated_at: new Date().toISOString(),
    }
    const { data } = await supabase
      .from('chart_notes')
      .upsert(payload, { onConflict: 'project_id,chart_type,date' })
      .select('id, note, author_email, updated_at')
      .single()
    if (data) setNote({ ...data, section_id: sectionId } as SectionNote)
  }, [projectId, sectionId])

  const deleteNote = useCallback(async () => {
    if (!projectId) return
    await supabase
      .from('chart_notes')
      .delete()
      .eq('project_id', projectId)
      .eq('chart_type', sectionId)
      .eq('date', DATE_KEY)
    setNote(null)
  }, [projectId, sectionId])

  return { note, saveNote, deleteNote }
}
