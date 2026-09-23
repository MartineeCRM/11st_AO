import { useMemo, useState, lazy, Suspense, Component, type ReactNode, type ErrorInfo } from 'react'
import { TopNav } from '@/components/TopNav'
const CRMAlwaysOn = lazy(() => import('@/pages/CRMAlwaysOn').then(m => ({ default: m.CRMAlwaysOn })))
import { CRMSettings } from '@/pages/CRMSettings'
import { useSheetConnectionState } from '@/hooks/useSheetConnectionState'
import { useAlertCampaignsState } from '@/hooks/useAlertCampaignsState'
import { useSheetData } from '@/hooks/useSheetData'
import { filterAoRows, listAoCampaignNames } from '@/lib/metrics'

export type Tab = 'ao' | 'settings'

const CHUNK_RELOAD_KEY = 'crm_dashboard_chunk_reload_attempted'

function isDynamicImportError(error: Error): boolean {
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk/i.test(error.message)
}

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
    if (isDynamicImportError(error) && sessionStorage.getItem(CHUNK_RELOAD_KEY) !== '1') {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
      window.location.reload()
    }
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
  const [activeTab, setActiveTab] = useState<Tab>('ao')
  const sheetConnection = useSheetConnectionState()
  const alertCampaigns = useAlertCampaignsState()

  // Settings의 "알림 대상 캠페인" 체크리스트도 실제 캠페인 목록이 필요해서, 시트 데이터는
  // 여기서 한 번만 받아 AO 탭/설정 탭에 props로 내려준다 (탭마다 따로 fetch하지 않도록).
  const sheetData = useSheetData(sheetConnection.connection)
  const aoRows = useMemo(() => filterAoRows(sheetData.rows), [sheetData.rows])
  const campaignOptions = useMemo(() => listAoCampaignNames(aoRows), [aoRows])

  function handleTabChange(tab: Tab) {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY)
    setActiveTab(tab)
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <TopNav activeTab={activeTab} onTabChange={handleTabChange} />
      <main>
        <ErrorBoundary>
          {activeTab === 'ao' && (
            <Suspense fallback={<div className="flex h-64 items-center justify-center"><div className="h-5 w-5 animate-spin rounded-full border-2 border-[#0066cc] border-t-transparent" /></div>}>
              <CRMAlwaysOn
                sheetData={sheetData}
                aoRows={aoRows}
                campaignOptions={campaignOptions}
                monitoredCampaigns={alertCampaigns.selected}
              />
            </Suspense>
          )}
          {activeTab === 'settings' && (
            <CRMSettings
              sheetConnection={sheetConnection}
              campaignOptions={campaignOptions}
              alertCampaigns={alertCampaigns}
            />
          )}
        </ErrorBoundary>
      </main>
    </div>
  )
}
