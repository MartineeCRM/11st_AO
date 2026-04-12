import { useMemo } from 'react'
import type { MartineeUnionRow, DailyKpiRow, FilterState } from '@/types/sheets'

export function useFilteredData(
  martinee: MartineeUnionRow[],
  kpi: DailyKpiRow[],
  filters: FilterState,
) {
  const filteredMartinee = useMemo(() => {
    return martinee.filter(row => {
      if (row.date < filters.dateRange.start || row.date > filters.dateRange.end) return false
      if (filters.variantDepth1.length > 0 && !filters.variantDepth1.includes(row.variant_depth_1)) return false
      if (filters.os.length > 0 && !filters.os.includes(row.os)) return false
      return true
    })
  }, [martinee, filters])

  const filteredKpi = useMemo(() => {
    return kpi.filter(row => {
      if (row.date < filters.dateRange.start || row.date > filters.dateRange.end) return false
      return true
    })
  }, [kpi, filters])

  const variantOptions = useMemo(
    () => [...new Set(martinee.map(r => r.variant_depth_1).filter(Boolean))].sort(),
    [martinee],
  )

  const osOptions = useMemo(
    () => [...new Set(martinee.map(r => r.os).filter(Boolean))].sort(),
    [martinee],
  )

  return { filteredMartinee, filteredKpi, variantOptions, osOptions }
}
