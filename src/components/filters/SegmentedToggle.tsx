import { cn } from '@/lib/utils'

interface Option<T extends string> {
  key: T
  label: string
}

interface Props<T extends string> {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
}

export function SegmentedToggle<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <div className="flex shrink-0 items-center rounded-lg border border-[#e0e0e0] bg-[#F9FAFB] p-0.5">
      {options.map(opt => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-all',
            value === opt.key
              ? 'border border-[#0066cc] bg-[#e8f0fb] text-[#0066cc]'
              : 'text-[#6B7280] hover:text-[#1d1d1f]',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
