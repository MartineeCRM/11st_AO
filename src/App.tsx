import { useState, Component, type ReactNode, type ErrorInfo } from 'react'
import { TopNav } from '@/components/TopNav'
import { CRMPerformance } from '@/pages/CRMPerformance'
import { CRMAttribution } from '@/pages/CRMAttribution'

type Tab = 'performance' | 'attribution'

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
            className="rounded-lg bg-[#4361EE] px-4 py-2 text-xs text-white"
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

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      <TopNav activeTab={activeTab} onTabChange={setActiveTab} />
      <main>
        <ErrorBoundary>
          {activeTab === 'performance' ? <CRMPerformance /> : <CRMAttribution />}
        </ErrorBoundary>
      </main>
    </div>
  )
}
