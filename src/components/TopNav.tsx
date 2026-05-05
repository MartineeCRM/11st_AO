import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Project } from '@/lib/supabase'

type Tab = 'performance' | 'attribution' | 'ops' | 'settings'

interface Props {
  activeTab: Tab
  onTabChange: (t: Tab) => void
  project: Project
  availableProjects: Project[]
  onProjectChange: (id: string) => void
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'performance', label: 'CRM 성과 모니터링' },
  { key: 'attribution', label: 'CRM Attribution' },
  { key: 'ops', label: '캠페인 운영 현황' },
  { key: 'settings', label: '설정' },
]

export function TopNav({ activeTab, onTabChange, project, availableProjects, onProjectChange }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const canSwitch = availableProjects.length >= 2

  useEffect(() => {
    if (!dropdownOpen) return
    function handleMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [dropdownOpen])

  async function handleSignOut() {
    await supabase.auth.signOut()
    localStorage.removeItem('crm_project_id')
  }

  function handleSelect(id: string) {
    onProjectChange(id)
    setDropdownOpen(false)
  }

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

      {/* 프로젝트 전환 + 로그아웃 */}
      <div className="ml-auto flex items-center gap-3">
        <div ref={dropdownRef} className="relative">
          {canSwitch ? (
            <button
              onClick={() => setDropdownOpen(o => !o)}
              className="flex items-center gap-1.5 rounded-full bg-[#EEF2FF] px-3 py-1 text-[11px] font-medium text-[#4361EE] hover:bg-[#E0E7FF] transition-colors"
            >
              {project.name}
              <ChevronDown className={cn('h-3 w-3 transition-transform', dropdownOpen && 'rotate-180')} />
            </button>
          ) : (
            <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-medium text-[#4361EE]">
              {project.name}
            </span>
          )}

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 min-w-[160px] rounded-xl border border-[#E5E7EB] bg-white shadow-lg z-50 overflow-hidden">
              {availableProjects.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p.id)}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-[#F9FAFB]"
                >
                  <Check
                    className={cn(
                      'h-3.5 w-3.5 flex-shrink-0',
                      p.id === project.id ? 'text-[#4361EE]' : 'invisible',
                    )}
                  />
                  <span className={cn(
                    'font-medium',
                    p.id === project.id ? 'text-[#4361EE]' : 'text-[#374151]',
                  )}>
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleSignOut}
          className="text-[11px] text-[#9CA3AF] hover:text-[#374151]"
        >
          로그아웃
        </button>
      </div>
    </header>
  )
}
