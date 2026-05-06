import { createContext, useContext } from 'react'

export const DEFAULT_CHART_COLORS = [
  '#4361EE', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
]

export const ChartColorsContext = createContext<string[]>(DEFAULT_CHART_COLORS)

export function useChartColors(): string[] {
  return useContext(ChartColorsContext)
}
