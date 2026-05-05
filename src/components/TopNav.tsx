import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

type Tab = 'performance' | 'attribution' | 'ops' | 'settings'

interface Props {
  activeTab: Tab
  onTabChange: (t: Tab) => void
  projectName?: string
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'performance', label: 'CRM 성과 모니터링' },
  { key: 'attribution', label: 'CRM Attribution' },
  { key: 'ops', label: '캠페인 운영 현황' },
  { key: 'settings', label: '설정' },
]

export function TopNav({ activeTab, onTabChange, projectName }: Props) {
  async function handleSignOut() {
    await supabase.auth.signOut()
    localStorage.removeItem('crm_project_id')
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center border-b border-[#E5E7EB] bg-white px-6">
      {/* 로고 */}
      <div className="flex items-center gap-2 mr-8">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4361EE]">
          <span className="text-xs font-bold text-white">M</span>
        </div>
        <span className="text-sm font-bold text-[#111827]">CRM Dashboard</span>
        {projectName && (
          <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-medium text-[#4361EE]">
            {projectName}
          </span>
        )}
      </div>

      {/* 탭 */}
      <nav className="flex items-center gap-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={cn(
              'relative px-3 py-1.5 text-sm font-medium transition-colors',
              activeTab === key
                ? 'text-[#4361EE]'
                : 'text-[#6B7280] hover:text-[#374151]',
            )}
          >
            {label}
            {activeTab === key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#4361EE]" />
            )}
          </button>
        ))}
      </nav>

      <button
        onClick={handleSignOut}
        className="ml-auto text-[11px] text-[#9CA3AF] hover:text-[#374151]"
      >
        로그아웃
      </button>
    </header>
  )
}
