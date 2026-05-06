import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export type ChartType = 'daily_send' | 'purchase_trend' | 'event_trend'

export interface ChartNote {
  id: string
  date: string
  note: string
  author_email: string | null
  updated_at: string
}

const PROJECT_KEY = 'crm_project_id'

function getProjectId(): string {
  return localStorage.getItem(PROJECT_KEY) ?? ''
}

export function useChartNotes(chartType: ChartType) {
  const [notes, setNotes] = useState<Map<string, ChartNote>>(new Map())
  const [loading, setLoading] = useState(true)

  const projectId = getProjectId()

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    const { data } = await supabase
      .from('chart_notes')
      .select('id, date, note, author_email, updated_at')
      .eq('project_id', projectId)
      .eq('chart_type', chartType)
    if (data) {
      const map = new Map<string, ChartNote>()
      for (const row of data) map.set(row.date, row as ChartNote)
      setNotes(map)
    }
    setLoading(false)
  }, [projectId, chartType])

  useEffect(() => { load() }, [load])

  const upsertNote = useCallback(async (date: string, note: string) => {
    if (!projectId) return
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      project_id: projectId,
      chart_type: chartType,
      date,
      note,
      author_id: user?.id ?? null,
      author_email: user?.email ?? null,
      updated_at: new Date().toISOString(),
    }
    const { data } = await supabase
      .from('chart_notes')
      .upsert(payload, { onConflict: 'project_id,chart_type,date' })
      .select('id, date, note, author_email, updated_at')
      .single()
    if (data) {
      setNotes(prev => new Map(prev).set(date, data as ChartNote))
    }
  }, [projectId, chartType])

  const deleteNote = useCallback(async (date: string) => {
    if (!projectId) return
    await supabase
      .from('chart_notes')
      .delete()
      .eq('project_id', projectId)
      .eq('chart_type', chartType)
      .eq('date', date)
    setNotes(prev => {
      const next = new Map(prev)
      next.delete(date)
      return next
    })
  }, [projectId, chartType])

  return { notes, loading, upsertNote, deleteNote }
}
