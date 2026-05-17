import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  label: string
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  allLabel?: string
}

export function MultiSelectFilter({ label, options, selected, onChange, allLabel = '전체' }: Props) {
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

  function toggle(opt: string) {
    if (selected.includes(opt)) {
      onChange(selected.filter(s => s !== opt))
    } else {
      onChange([...selected, opt])
    }
  }

  function selectAll() {
    onChange([])
    setOpen(false)
    setQuery('')
  }

  function selectFiltered() {
    const next = Array.from(new Set([...selected, ...filtered]))
    onChange(next)
  }

  function deselectFiltered() {
    onChange(selected.filter(s => !filtered.includes(s)))
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every(o => selected.includes(o))

  const displayLabel =
    selected.length === 0 ? `${label} ${allLabel}` : `${label} (${selected.length})`

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-lg border border-[#e0e0e0] bg-[#F9FAFB] px-3 py-1.5 text-xs text-[#1d1d1f] hover:bg-[#F3F4F6] transition-colors"
      >
        <span>{displayLabel}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-[#9CA3AF] transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 min-w-[200px] rounded-lg border border-[#e0e0e0] bg-white shadow-lg py-1">
          {/* 검색창 */}
          <div className="px-2 pb-1 pt-1">
            <div className="flex items-center gap-1.5 rounded-md border border-[#e0e0e0] bg-[#F9FAFB] px-2 py-1">
              <Search className="h-3 w-3 text-[#9CA3AF] shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="검색..."
                className="w-full bg-transparent text-xs text-[#1d1d1f] placeholder-[#9CA3AF] focus:outline-none"
              />
            </div>
          </div>

          {/* 검색 결과 전체선택/해제 */}
          {query.trim() && filtered.length > 0 && (
            <button
              onClick={allFilteredSelected ? deselectFiltered : selectFiltered}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#0066cc] font-semibold hover:bg-[#F9FAFB]"
            >
              <Check className={cn('h-3 w-3', allFilteredSelected ? 'opacity-100' : 'opacity-0')} />
              검색 결과 전체 {allFilteredSelected ? '해제' : '선택'} ({filtered.length}개)
            </button>
          )}

          {/* 전체 선택 (검색어 없을 때만) */}
          {!query.trim() && (
            <button
              onClick={selectAll}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-[#F9FAFB]',
                selected.length === 0 ? 'text-[#0066cc] font-semibold' : 'text-[#1d1d1f]',
              )}
            >
              <Check className={cn('h-3 w-3', selected.length === 0 ? 'opacity-100' : 'opacity-0')} />
              전체
            </button>
          )}

          <div className="my-1 border-t border-[#F3F4F6]" />

          <div className="max-h-[320px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-[#9CA3AF]">검색 결과 없음</p>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt}
                  onClick={() => toggle(opt)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#1d1d1f] hover:bg-[#F9FAFB]"
                >
                  <Check className={cn('h-3 w-3 text-[#0066cc]', selected.includes(opt) ? 'opacity-100' : 'opacity-0')} />
                  {opt}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
