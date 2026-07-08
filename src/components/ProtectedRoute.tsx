import type { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useProject } from '@/hooks/useProject'
import { Login } from '@/pages/Login'
import { ProjectSelect } from '@/pages/ProjectSelect'
import type { Project, DashboardLayout } from '@/lib/supabase'

interface ProjectContext {
  project: Project
  availableProjects: Project[]
  setProjectId: (id: string) => void
  saveDashboardLayout: (layout: DashboardLayout) => Promise<void>
}

interface Props {
  children: (ctx: ProjectContext) => ReactNode
}

export function ProtectedRoute({ children }: Props) {
  const { user, loading: authLoading } = useAuth()
  const { project, availableProjects, loading: projectLoading, error, setProjectId, saveDashboardLayout } = useProject(user?.id ?? null)

  if (authLoading || projectLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#0066cc] border-t-transparent" />
      </div>
    )
  }

  if (!user) return <Login />

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7]">
        <div className="rounded-[18px] border border-[#e0e0e0] bg-white p-8 text-center">
          <p className="text-sm font-semibold text-[#EF4444]">{error}</p>
          <p className="mt-1 text-xs text-[#9CA3AF]">관리자에게 문의하세요.</p>
        </div>
      </div>
    )
  }

  // 여러 프로젝트 접근 권한이 있고 아직 선택 안 된 경우
  if (!project && availableProjects.length > 1) {
    return <ProjectSelect projects={availableProjects} onSelect={setProjectId} />
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7]">
        <div className="rounded-[18px] border border-[#e0e0e0] bg-white p-8 text-center max-w-sm">
          <p className="text-sm font-semibold text-[#1d1d1f]">접근 가능한 프로젝트가 없습니다</p>
          <p className="mt-1 text-xs text-[#9CA3AF]">관리자에게 프로젝트 접근 권한을 요청하세요.</p>
          <button
            onClick={() => { localStorage.removeItem('crm_project_id'); window.location.reload() }}
            className="mt-4 text-xs text-[#0066cc] hover:underline"
          >
            로그아웃
          </button>
        </div>
      </div>
    )
  }

  return <>{children({ project, availableProjects, setProjectId, saveDashboardLayout })}</>
}
