import { cn } from '@/lib/utils'
import type { Tab } from '@/App'

interface Props {
  activeTab: Tab
  onTabChange: (t: Tab) => void
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'ao', label: 'AO 캠페인 모니터링' },
  { key: 'settings', label: '설정' },
]

export function TopNav({ activeTab, onTabChange }: Props) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center border-b border-[#e0e0e0] bg-white px-6">
      <div className="flex items-center gap-2 mr-8">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0066cc]">
          <span className="text-xs font-bold text-white">M</span>
        </div>
        <span className="text-sm font-bold text-[#1d1d1f]">CRM Dashboard</span>
      </div>

      <nav className="flex items-center gap-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={cn(
              'relative px-3 py-1.5 text-sm font-medium transition-colors',
              activeTab === key
                ? 'text-[#0066cc]'
                : 'text-[#6B7280] hover:text-[#1d1d1f]',
            )}
          >
            {label}
            {activeTab === key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#0066cc]" />
            )}
          </button>
        ))}
      </nav>
    </header>
  )
}
