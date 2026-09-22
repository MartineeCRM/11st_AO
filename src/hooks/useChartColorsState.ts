import { useEffect, useState } from 'react'
import { DEFAULT_CHART_COLORS } from '@/lib/chartColors'

const STORAGE_KEY = 'crm_chart_colors'
const MAX_COLORS = 8

function loadColors(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CHART_COLORS
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 && parsed.every(c => typeof c === 'string')
      ? parsed
      : DEFAULT_CHART_COLORS
  } catch {
    return DEFAULT_CHART_COLORS
  }
}

export function useChartColorsState() {
  const [colors, setColors] = useState<string[]>(loadColors)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(colors))
    } catch {
      // localStorage 접근 불가(프라이빗 모드 등) — 조용히 무시, 세션 내 상태는 계속 동작
    }
  }, [colors])

  function updateColor(index: number, value: string) {
    setColors(prev => prev.map((c, i) => (i === index ? value : c)))
  }

  function addColor() {
    setColors(prev => (prev.length >= MAX_COLORS ? prev : [...prev, '#000000']))
  }

  function removeColor(index: number) {
    setColors(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  return { colors, updateColor, addColor, removeColor }
}
