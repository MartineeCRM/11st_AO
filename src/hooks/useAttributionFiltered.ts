import { useMemo } from 'react'
import type { AttDataRow } from '@/types/sheets'

export interface AttributionFilterState {
  dateRange: { start: string; end: string }
  sourceAlias: string[]
  variantAlias: string[]
  category: string[]
  messageType: string[]
  os: string[]
}

export function useAttributionFiltered(
  rows: AttDataRow[],
  filters: AttributionFilterState,
): {
  filteredRows: AttDataRow[]
  extendedRows: AttDataRow[]   // WoW/MoM용: startDate -30일 포함
  filterOptions: {
    sourceAlias: string[]
    variantAlias: string[]
    category: string[]
    messageType: string[]
    os: string[]
  }
} {
  // 필터 옵션 목록은 전체 rows에서 동적 추출
  const filterOptions = useMemo(() => {
    const unique = <K extends keyof AttDataRow>(key: K) =>
      [...new Set(rows.map(r => String(r[key])).filter(Boolean))].sort()
    return {
      sourceAlias: unique('source_alias'),
      variantAlias: unique('variant_alias'),
      category: unique('category'),
      messageType: unique('message_type'),
      os: unique('os'),
    }
  }, [rows])

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      if (r.date < filters.dateRange.start || r.date > filters.dateRange.end) return false
      if (filters.sourceAlias.length > 0 && !filters.sourceAlias.includes(r.source_alias)) return false
      if (filters.variantAlias.length > 0 && !filters.variantAlias.includes(r.variant_alias)) return false
      if (filters.category.length > 0 && !filters.category.includes(r.category)) return false
      if (filters.messageType.length > 0 && !filters.messageType.includes(r.message_type)) return false
      if (filters.os.length > 0 && !filters.os.includes(r.os)) return false
      return true
    })
  }, [rows, filters])

  // WoW/MoM용: 날짜 필터만 -30일 확장, 나머지 필터는 동일하게 적용
  const extendedRows = useMemo(() => {
    const extStart = shiftDate(filters.dateRange.start, -30)
    return rows.filter(r => {
      if (r.date < extStart || r.date > filters.dateRange.end) return false
      if (filters.sourceAlias.length > 0 && !filters.sourceAlias.includes(r.source_alias)) return false
      if (filters.variantAlias.length > 0 && !filters.variantAlias.includes(r.variant_alias)) return false
      if (filters.category.length > 0 && !filters.category.includes(r.category)) return false
      if (filters.messageType.length > 0 && !filters.messageType.includes(r.message_type)) return false
      if (filters.os.length > 0 && !filters.os.includes(r.os)) return false
      return true
    })
  }, [rows, filters])

  return { filteredRows, extendedRows, filterOptions }
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
