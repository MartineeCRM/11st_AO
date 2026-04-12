import { useState, useEffect, useRef } from 'react'
import { fetchMartineeUnion, fetchDailyKpi } from '@/lib/googleSheets'
import type { MartineeUnionRow, DailyKpiRow } from '@/types/sheets'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5분

interface CacheEntry<T> {
  data: T
  fetchedAt: number
}

const cache: {
  martinee?: CacheEntry<MartineeUnionRow[]>
  kpi?: CacheEntry<DailyKpiRow[]>
} = {}

export interface SheetData {
  martinee: MartineeUnionRow[]
  kpi: DailyKpiRow[]
  loading: boolean
  error: string | null
  /** 전체 기간 */
  dateRange: { min: string; max: string } | null
}

export function useSheetData(): SheetData {
  const [martinee, setMartinee] = useState<MartineeUnionRow[]>([])
  const [kpi, setKpi] = useState<DailyKpiRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const now = Date.now()
        const needsMartinee = !cache.martinee || now - cache.martinee.fetchedAt > CACHE_TTL_MS
        const needsKpi = !cache.kpi || now - cache.kpi.fetchedAt > CACHE_TTL_MS

        const [mData, kData] = await Promise.all([
          needsMartinee ? fetchMartineeUnion() : Promise.resolve(cache.martinee!.data),
          needsKpi ? fetchDailyKpi() : Promise.resolve(cache.kpi!.data),
        ])

        if (needsMartinee) cache.martinee = { data: mData, fetchedAt: Date.now() }
        if (needsKpi) cache.kpi = { data: kData, fetchedAt: Date.now() }

        if (mounted.current) {
          setMartinee(mData)
          setKpi(kData)
        }
      } catch (err) {
        if (mounted.current) {
          setError(err instanceof Error ? err.message : '데이터 로드 실패')
        }
      } finally {
        if (mounted.current) setLoading(false)
      }
    }

    void load()
    return () => { mounted.current = false }
  }, [])

  const allDates = [
    ...martinee.map(r => r.date),
    ...kpi.map(r => r.date),
  ].filter(Boolean).sort()

  const dateRange =
    allDates.length > 0
      ? { min: allDates[0], max: allDates[allDates.length - 1] }
      : null

  return { martinee, kpi, loading, error, dateRange }
}
