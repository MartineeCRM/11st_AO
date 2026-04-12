import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
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
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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
  }

  const displayLabel =
    selected.length === 0 ? `${label} ${allLabel}` : `${label} (${selected.length})`

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1.5 text-xs text-[#374151] hover:bg-[#F3F4F6] transition-colors"
      >
        <span>{displayLabel}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-[#9CA3AF] transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 min-w-[160px] rounded-lg border border-[#E5E7EB] bg-white shadow-lg py-1">
          <button
            onClick={selectAll}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-[#F9FAFB]',
              selected.length === 0 ? 'text-[#4361EE] font-semibold' : 'text-[#374151]',
            )}
          >
            <Check className={cn('h-3 w-3', selected.length === 0 ? 'opacity-100' : 'opacity-0')} />
            전체
          </button>
          <div className="my-1 border-t border-[#F3F4F6]" />
          <div className="max-h-[420px] overflow-y-auto">
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => toggle(opt)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#374151] hover:bg-[#F9FAFB]"
              >
                <Check className={cn('h-3 w-3 text-[#4361EE]', selected.includes(opt) ? 'opacity-100' : 'opacity-0')} />
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
