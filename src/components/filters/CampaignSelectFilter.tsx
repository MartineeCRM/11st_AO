import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Search, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  label: string
  options: string[]
  selected: string
  onChange: (selected: string) => void
  monitoredCampaigns?: string[]
}

export function CampaignSelectFilter({ label, options, selected, onChange, monitoredCampaigns = [] }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = query.trim()
    ? options.filter(o => o.toLowerCase().includes(query.trim().toLowerCase()))
    : options

  function select(opt: string) {
    onChange(opt)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex max-w-[280px] items-center gap-2 rounded-lg border border-[#e0e0e0] bg-[#F9FAFB] px-3 py-1.5 text-xs text-[#1d1d1f] hover:bg-[#F3F4F6] transition-colors"
      >
        <span className="truncate">{selected || `${label} 선택`}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-[#9CA3AF] transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 min-w-[280px] rounded-lg border border-[#e0e0e0] bg-white shadow-lg py-1">
          <div className="px-2 pb-1 pt-1">
            <div className="flex items-center gap-1.5 rounded-md border border-[#e0e0e0] bg-[#F9FAFB] px-2 py-1">
              <Search className="h-3 w-3 text-[#9CA3AF] shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="캠페인 검색..."
                className="w-full bg-transparent text-xs text-[#1d1d1f] placeholder-[#9CA3AF] focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-[#9CA3AF]">검색 결과 없음</p>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt}
                  onClick={() => select(opt)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[#1d1d1f] hover:bg-[#F9FAFB]"
                >
                  <Check className={cn('h-3 w-3 shrink-0 text-[#0066cc]', opt === selected ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">{opt}</span>
                  {monitoredCampaigns.includes(opt) && (
                    <Star className="h-3 w-3 shrink-0 fill-[#F59E0B] text-[#F59E0B]" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
