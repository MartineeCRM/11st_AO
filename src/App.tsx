import { useState, Component, type ReactNode, type ErrorInfo } from 'react'
import { TopNav } from '@/components/TopNav'
import { CRMPerformance } from '@/pages/CRMPerformance'
import { CRMAttribution } from '@/pages/CRMAttribution'
import { CRMCampaignOps } from '@/pages/CRMCampaignOps'
import { CRMSettings } from '@/pages/CRMSettings'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ChartColorsContext, DEFAULT_CHART_COLORS } from '@/lib/chartColors'

type Tab = 'performance' | 'attribution' | 'ops' | 'settings'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }
  render() {
    const { error } = this.state
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <p className="text-sm font-semibold text-[#EF4444]">렌더 오류 발생</p>
          <pre className="max-w-2xl rounded-lg bg-[#FEF2F2] p-4 text-xs text-[#EF4444] whitespace-pre-wrap break-all">
            {error.message}
            {'\n'}
            {error.stack}
          </pre>
          <button
            className="rounded-lg bg-[#0066cc] px-4 py-2 text-xs text-white"
            onClick={() => this.setState({ error: null })}
          >
            다시 시도
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('performance')
  const [pendingId, setPendingId] = useState<string | null>(null)

  return (
    <ProtectedRoute>
      {({ project, availableProjects, setProjectId }) => {
        const switching = pendingId !== null && pendingId !== project.id

        function handleProjectChange(id: string) {
          setPendingId(id)
          setProjectId(id)
        }

        return (
        <ChartColorsContext.Provider value={project?.chart_colors?.length ? project.chart_colors : DEFAULT_CHART_COLORS}>
        <div className="min-h-screen bg-[#f5f5f7]">
          <TopNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
            project={project}
            availableProjects={availableProjects}
            onProjectChange={handleProjectChange}
          />
          <main>
            {switching ? (
              <div className="flex flex-col items-center justify-center py-40 gap-3">
                <div className="h-6 w-6 rounded-full border-2 border-[#0066cc] border-t-transparent animate-spin" />
                <p className="text-sm text-[#6B7280]">프로젝트 변경 중...</p>
              </div>
            ) : (
              <ErrorBoundary key={project.id}>
                {activeTab === 'performance' && <CRMPerformance key={project.id} />}
                {activeTab === 'attribution' && <CRMAttribution key={project.id} />}
                {activeTab === 'ops' && <CRMCampaignOps key={project.id} />}
                {activeTab === 'settings' && <CRMSettings project={project} />}
              </ErrorBoundary>
            )}
          </main>
        </div>
        </ChartColorsContext.Provider>
        )
      }}
    </ProtectedRoute>
  )
}
