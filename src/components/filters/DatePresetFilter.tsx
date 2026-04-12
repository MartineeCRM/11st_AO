import { useState, useRef, useEffect } from 'react'
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
  onPresetChange: (p: Preset | null) => void
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
  const [calOpen, setCalOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange>({ start: '', end: '' })
  const calRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (calRef.current && !calRef.current.contains(e.target as Node)) setCalOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handlePreset(p: Preset) {
    onPresetChange(p)
    setCalOpen(false)
    if (p === 'all') {
      onChange({ start: minDate, end: maxDate })
    } else {
      onChange(presetToRange(p, maxDate))
    }
  }

  function openCalendar() {
    setDraft({ start: value.start || minDate, end: value.end || maxDate })
    setCalOpen(o => !o)
  }

  function applyCustom() {
    if (!draft.start || !draft.end) return
    onChange(draft)
    onPresetChange(null)
    setCalOpen(false)
  }

  const displayStart = value.start || minDate
  const displayEnd = value.end || maxDate

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

      {/* 캘린더 날짜 직접 선택 */}
      {minDate && maxDate && (
        <div ref={calRef} className="relative">
          <button
            onClick={openCalendar}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors',
              calOpen
                ? 'border-[#4361EE] bg-[#EEF1FF] text-[#4361EE]'
                : activePreset === null
                  ? 'border-[#4361EE] bg-[#EEF1FF] text-[#4361EE]'
                  : 'border-[#E5E7EB] bg-[#F9FAFB] text-[#374151] hover:bg-[#F3F4F6]',
            )}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{displayStart} ~ {displayEnd}</span>
          </button>

          {calOpen && (
            <div className="absolute top-full left-0 z-50 mt-1 w-60 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-lg">
              <div className="mb-3 flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">시작일</label>
                <input
                  type="date"
                  value={draft.start}
                  min={minDate}
                  max={draft.end || maxDate}
                  onChange={e => setDraft(d => ({ ...d, start: e.target.value }))}
                  className="rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-xs text-[#374151] focus:border-[#4361EE] focus:outline-none"
                />
              </div>
              <div className="mb-4 flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">종료일</label>
                <input
                  type="date"
                  value={draft.end}
                  min={draft.start || minDate}
                  max={maxDate}
                  onChange={e => setDraft(d => ({ ...d, end: e.target.value }))}
                  className="rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-xs text-[#374151] focus:border-[#4361EE] focus:outline-none"
                />
              </div>
              <button
                onClick={applyCustom}
                disabled={!draft.start || !draft.end}
                className="w-full rounded-lg bg-[#4361EE] py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#3451D1] disabled:opacity-40"
              >
                적용
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
