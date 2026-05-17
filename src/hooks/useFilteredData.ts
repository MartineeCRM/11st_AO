import { useMemo } from 'react'
import type { MartineeUnionRow, DailyKpiRow, FilterState } from '@/types/sheets'

export function useFilteredData(
  martinee: MartineeUnionRow[],
  kpi: DailyKpiRow[],
  filters: FilterState,
) {
  const filteredMartinee = useMemo(() => {
    const { start, end } = filters.dateRange
    return martinee.filter(row => {
      if (start && row.date < start) return false
      if (end && row.date > end) return false
      if (filters.campaignDepth1.length > 0 && !filters.campaignDepth1.includes(row.campaign_depth_1)) return false
      if (filters.os.length > 0 && !filters.os.includes(row.os)) return false
      if (filters.category.length > 0 && !filters.category.includes(row.category)) return false
      if (filters.channel.length > 0 && !filters.channel.includes(row.channel)) return false
      if (filters.messageType.length > 0 && !filters.messageType.includes(row.message_type)) return false
      return true
    })
  }, [martinee, filters])

  const filteredKpi = useMemo(() => {
    const { start, end } = filters.dateRange
    return kpi.filter(row => {
      if (start && row.date < start) return false
      if (end && row.date > end) return false
      return true
    })
  }, [kpi, filters])

  const campaignDepth1Options = useMemo(
    () => [...new Set(martinee.map(r => r.campaign_depth_1).filter(Boolean))].sort(),
    [martinee],
  )

  const osOptions = useMemo(
    () => [...new Set(martinee.map(r => r.os).filter(Boolean))].sort(),
    [martinee],
  )

  const categoryOptions = useMemo(
    () => [...new Set(martinee.map(r => r.category).filter(Boolean))].sort(),
    [martinee],
  )

  const channelOptions = useMemo(
    () => [...new Set(martinee.map(r => r.channel).filter(Boolean))].sort(),
    [martinee],
  )

  const messageTypeOptions = useMemo(
    () => [...new Set(martinee.map(r => r.message_type).filter(Boolean))].sort(),
    [martinee],
  )

  return { filteredMartinee, filteredKpi, campaignDepth1Options, osOptions, categoryOptions, channelOptions, messageTypeOptions }
}
