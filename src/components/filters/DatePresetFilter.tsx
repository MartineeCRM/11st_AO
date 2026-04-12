import { cn } from '@/lib/utils'
import { toDateStr } from '@/lib/formatters'
import type { DateRange } from '@/types/sheets'

export type Preset = 'yesterday' | '7d' | '30d' | 'all'

interface Props {
  value: DateRange
  onChange: (range: DateRange) => void
  minDate: string
  maxDate: string
  activePreset: Preset | null
  onPresetChange: (p: Preset) => void
}

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'yesterday', label: '어제' },
  { key: '7d', label: '최근 7일' },
  { key: '30d', label: '최근 30일' },
  { key: 'all', label: '전체 기간' },
]

export function presetToRange(preset: Preset, maxDate: string): DateRange {
  const end = maxDate
  if (preset === 'yesterday') {
    const d = new Date(maxDate)
    d.setDate(d.getDate() - 1)
    const y = toDateStr(d)
    return { start: y, end: y }
  }
  if (preset === '7d') {
    const d = new Date(maxDate)
    d.setDate(d.getDate() - 6)
    return { start: toDateStr(d), end }
  }
  if (preset === '30d') {
    const d = new Date(maxDate)
    d.setDate(d.getDate() - 29)
    return { start: toDateStr(d), end }
  }
  return { start: '', end: '' } // 'all' - handled by caller
}

export function DatePresetFilter({ value, minDate, maxDate, activePreset, onPresetChange, onChange }: Props) {
  function handlePreset(p: Preset) {
    onPresetChange(p)
    if (p === 'all') {
      onChange({ start: minDate, end: maxDate })
    } else {
      onChange(presetToRange(p, maxDate))
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-semibold text-[#374151]">기간</span>

      {/* 프리셋 버튼 그룹 */}
      <div className="flex items-center rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-0.5">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => handlePreset(p.key)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-all',
              activePreset === p.key
                ? 'border border-[#4361EE] bg-[#EEF1FF] text-[#4361EE]'
                : 'text-[#6B7280] hover:text-[#374151]',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 전체 기간 표기 */}
      {minDate && maxDate && (
        <div className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1.5 text-xs text-[#374151]">
          <svg className="h-3.5 w-3.5 text-[#9CA3AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>
            {value.start || minDate} ~ {value.end || maxDate}
          </span>
        </div>
      )}
    </div>
  )
}
