import { cn } from '@/lib/utils'

interface Option<T extends string> {
  key: T
  label: string
}

interface Props<T extends string> {
  options: Option<T>[]
  active: T
  onChange: (key: T) => void
}

export function MetricToggleGroup<T extends string>({ options, active, onChange }: Props<T>) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            active === opt.key
              ? 'bg-[#4361EE] text-white'
              : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#374151]',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
