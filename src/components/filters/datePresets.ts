import { addDays } from '@/lib/formatters'
import type { DateRange } from '@/types/sheets'

export type Preset = 'yesterday' | '7d' | '30d' | 'all'

export const PRESETS: { key: Preset; label: string }[] = [
  { key: 'yesterday', label: '어제' },
  { key: '7d', label: '최근 7일' },
  { key: '30d', label: '최근 30일' },
  { key: 'all', label: '전체 기간' },
]

export function presetToRange(preset: Preset, maxDate: string): DateRange {
  const end = maxDate
  if (preset === 'yesterday') {
    const yesterday = addDays(maxDate, -1)
    return { start: yesterday, end: yesterday }
  }
  if (preset === '7d') {
    return { start: addDays(maxDate, -6), end }
  }
  if (preset === '30d') {
    return { start: addDays(maxDate, -29), end }
  }
  return { start: '', end: '' }
}
