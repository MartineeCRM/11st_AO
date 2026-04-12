import { cn } from '@/lib/utils'

type Tab = 'performance' | 'attribution'

interface Props {
  activeTab: Tab
  onTabChange: (t: Tab) => void
}

export function TopNav({ activeTab, onTabChange }: Props) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center border-b border-[#E5E7EB] bg-white px-6">
      {/* 로고 */}
      <div className="flex items-center gap-2 mr-8">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4361EE]">
          <span className="text-xs font-bold text-white">M</span>
        </div>
        <span className="text-sm font-bold text-[#111827]">CRM Dashboard</span>
      </div>

      {/* 탭 */}
      <nav className="flex items-center gap-1">
        <button
          onClick={() => onTabChange('performance')}
          className={cn(
            'relative px-3 py-1.5 text-sm font-medium transition-colors',
            activeTab === 'performance'
              ? 'text-[#4361EE]'
              : 'text-[#6B7280] hover:text-[#374151]',
          )}
        >
          CRM 성과 모니터링
          {activeTab === 'performance' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#4361EE]" />
          )}
        </button>

        <button
          onClick={() => onTabChange('attribution')}
          className={cn(
            'relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors',
            activeTab === 'attribution'
              ? 'text-[#4361EE]'
              : 'text-[#6B7280] hover:text-[#374151]',
          )}
        >
          CRM Attribution
          <span className="rounded-full bg-[#F3F4F6] px-1.5 py-0.5 text-[10px] font-semibold text-[#9CA3AF]">
            준비중
          </span>
          {activeTab === 'attribution' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#4361EE]" />
          )}
        </button>
      </nav>
    </header>
  )
}
