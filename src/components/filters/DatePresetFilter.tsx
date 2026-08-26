import { useState, useRef, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import type { DateRange as DayRange } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { parseDateStr, toDateStr } from '@/lib/formatters'
import type { DateRange } from '@/types/sheets'
import { PRESETS, type Preset, presetToRange } from './datePresets'

interface Props {
  value: DateRange
  onChange: (range: DateRange) => void
  minDate: string
  maxDate: string
  activePreset: Preset | null
  onPresetChange: (p: Preset | null) => void
}

function toDate(s: string) {
  return parseDateStr(s) ?? undefined
}

function toStr(d: Date | undefined) {
  if (!d) return ''
  return toDateStr(d)
}

/** 캘린더를 열 때 종료일이 보이는 달을 오른쪽 패널에 오도록 시작 달을 계산 (범위가 넓으면 종료일 우선 표시) */
function defaultCalendarMonth(value: DateRange, minDate: string, maxDate: string): Date | undefined {
  const end = toDate(value.end || maxDate)
  if (!end) return toDate(minDate)
  const month = new Date(end)
  month.setMonth(month.getMonth() - 1)
  return month
}

export function DatePresetFilter({ value, minDate, maxDate, activePreset, onPresetChange, onChange }: Props) {
  const [calOpen, setCalOpen] = useState(false)
  const [range, setRange] = useState<DayRange>({
    from: toDate(value.start),
    to: toDate(value.end),
  })
  const [pendingFrom, setPendingFrom] = useState<Date | undefined>(undefined)
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
      setRange({ from: toDate(minDate), to: toDate(maxDate) })
    } else {
      const r = presetToRange(p, maxDate)
      onChange(r)
      setRange({ from: toDate(r.start), to: toDate(r.end) })
    }
  }

  function handleDayPickerSelect(_selected: DayRange | undefined, triggerDate: Date) {
    if (!pendingFrom) {
      setPendingFrom(triggerDate)
      setRange({ from: triggerDate, to: undefined })
      return
    }
    const start = triggerDate < pendingFrom ? triggerDate : pendingFrom
    const end = triggerDate < pendingFrom ? pendingFrom : triggerDate
    setRange({ from: start, to: end })
    onChange({ start: toStr(start), end: toStr(end) })
    onPresetChange(null)
    setPendingFrom(undefined)
    setCalOpen(false)
  }

  function openCalendar() {
    setRange({ from: toDate(value.start), to: toDate(value.end) })
    setPendingFrom(undefined)
    setCalOpen(o => !o)
  }

  const displayStart = value.start || minDate
  const displayEnd = value.end || maxDate

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-semibold text-[#1d1d1f]">기간</span>

      {/* 프리셋 버튼 그룹 */}
      <div className="flex items-center rounded-lg border border-[#e0e0e0] bg-[#F9FAFB] p-0.5">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => handlePreset(p.key)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-all',
              activePreset === p.key
                ? 'border border-[#0066cc] bg-[#e8f0fb] text-[#0066cc]'
                : 'text-[#6B7280] hover:text-[#1d1d1f]',
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
                ? 'border-[#0066cc] bg-[#e8f0fb] text-[#0066cc]'
                : activePreset === null
                  ? 'border-[#0066cc] bg-[#e8f0fb] text-[#0066cc]'
                  : 'border-[#e0e0e0] bg-[#F9FAFB] text-[#1d1d1f] hover:bg-[#F3F4F6]',
            )}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{displayStart} ~ {displayEnd}</span>
          </button>

          {calOpen && (
            <div className="absolute top-full left-0 z-50 mt-1 rounded-xl border border-[#e0e0e0] bg-white shadow-lg">
              {pendingFrom && (
                <div className="border-b border-[#e0e0e0] px-4 py-2 text-xs font-medium text-[#0066cc]">
                  시작일 {toStr(pendingFrom)} 선택됨 · 종료일을 선택하세요
                </div>
              )}
              <DayPicker
                mode="range"
                selected={range}
                onSelect={handleDayPickerSelect}
                fromDate={toDate(minDate)}
                toDate={toDate(maxDate)}
                numberOfMonths={2}
                defaultMonth={defaultCalendarMonth(value, minDate, maxDate)}
                modifiers={pendingFrom ? { pending: pendingFrom } : undefined}
                modifiersClassNames={{
                  pending: 'bg-[#0066cc] text-white rounded-md ring-2 ring-[#0066cc] ring-offset-2 font-bold',
                }}
                styles={{
                  root: { margin: 0, padding: '12px 16px', fontSize: 13 },
                }}
                classNames={{
                  day_selected: 'bg-[#0066cc] text-white rounded-md',
                  day_range_middle: 'bg-[#e8f0fb] text-[#0066cc] rounded-none',
                  day_range_start: 'bg-[#0066cc] text-white rounded-l-md',
                  day_range_end: 'bg-[#0066cc] text-white rounded-r-md',
                  day_today: 'font-bold text-[#0066cc]',
                  button: 'hover:bg-[#F3F4F6] rounded-md',
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
