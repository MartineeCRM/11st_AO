import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Project, DashboardLayout } from '@/lib/supabase'

const PROJECT_KEY = 'crm_project_id'

interface ProjectState {
  project: Project | null
  projectId: string | null
  loading: boolean
  error: string | null
  availableProjects: Project[]
  setProjectId: (id: string) => void
  saveTriggerMappings: (mappings: Record<string, string>) => Promise<void>
  saveDashboardLayout: (layout: DashboardLayout) => Promise<void>
}

export function useProject(userId: string | null): ProjectState {
  const [project, setProject] = useState<Project | null>(null)
  const [availableProjects, setAvailableProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projectId, setProjectIdState] = useState<string | null>(
    () => localStorage.getItem(PROJECT_KEY),
  )

  const setProjectId = (id: string) => {
    localStorage.setItem(PROJECT_KEY, id)
    setProjectIdState(id)
  }

  useEffect(() => {
    if (!userId) {
      setProject(null)
      setAvailableProjects([])
      setLoading(false)
      return
    }

    async function load() {
      setLoading(true)
      setError(null)

      // 접근 가능한 프로젝트 목록 조회 (RLS 적용)
      const { data: memberships, error: memErr } = await supabase
        .from('project_members')
        .select('project_id, role')
        .eq('user_id', userId)

      if (memErr || !memberships) {
        setError('프로젝트 목록을 불러올 수 없습니다.')
        setLoading(false)
        return
      }

      const projectIds = memberships.map(m => m.project_id)
      if (projectIds.length === 0) {
        setError('접근 가능한 프로젝트가 없습니다. 관리자에게 문의하세요.')
        setLoading(false)
        return
      }

      const { data: projects, error: projErr } = await supabase
        .from('projects')
        .select('id, name, chart_colors, metric_definitions, spreadsheet_id, trigger_mappings, dashboard_layout')
        .in('id', projectIds)

      if (projErr || !projects) {
        setError('프로젝트 정보를 불러올 수 없습니다.')
        setLoading(false)
        return
      }

      setAvailableProjects(projects as Project[])

      // 저장된 projectId가 있고 접근 권한이 있으면 사용, 아니면 첫 번째
      const savedId = localStorage.getItem(PROJECT_KEY)
      const validProject = projects.find(p => p.id === savedId) ?? projects[0]
      setProjectIdState(validProject.id)
      localStorage.setItem(PROJECT_KEY, validProject.id)
      setProject(validProject as Project)
      setLoading(false)
    }

    load()
  }, [userId])

  // projectId 변경 시 프로젝트 정보 업데이트
  useEffect(() => {
    if (!projectId || availableProjects.length === 0) return
    const found = availableProjects.find(p => p.id === projectId)
    if (found) setProject(found as Project)
  }, [projectId, availableProjects])

  async function saveTriggerMappings(mappings: Record<string, string>) {
    if (!project) return
    const { error } = await supabase
      .from('projects')
      .update({ trigger_mappings: mappings })
      .eq('id', project.id)
    if (error) throw new Error(error.message)
    setProject(prev => prev ? { ...prev, trigger_mappings: mappings } : prev)
    setAvailableProjects(prev =>
      prev.map(p => p.id === project.id ? { ...p, trigger_mappings: mappings } : p)
    )
  }

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

  return { project, projectId, loading, error, availableProjects, setProjectId, saveTriggerMappings, saveDashboardLayout }
}
