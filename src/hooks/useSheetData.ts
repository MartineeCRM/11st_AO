import { useState, useEffect, useRef } from 'react'
import { fetchMartineeUnion, fetchDailyKpi } from '@/lib/googleSheets'
import type { MartineeUnionRow, DailyKpiRow } from '@/types/sheets'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5분

interface CacheEntry<T> {
  data: T
  fetchedAt: number
}

// 캐시 키에 project_id 포함 — 프로젝트 전환 시 다른 슬롯 사용
type CacheKey = `${string}:martinee` | `${string}:kpi`
const cache = new Map<CacheKey, CacheEntry<MartineeUnionRow[] | DailyKpiRow[]>>()
const pendingRequests = new Map<CacheKey, Promise<MartineeUnionRow[] | DailyKpiRow[]>>()

function getProjectId(): string {
  return localStorage.getItem('crm_project_id') ?? 'default'
}

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
        const pid = getProjectId()
        const mKey: CacheKey = `${pid}:martinee`
        const kKey: CacheKey = `${pid}:kpi`

        const cachedM = cache.get(mKey)
        const cachedK = cache.get(kKey)
        const needsMartinee = !cachedM || now - cachedM.fetchedAt > CACHE_TTL_MS
        const needsKpi = !cachedK || now - cachedK.fetchedAt > CACHE_TTL_MS

        if (needsMartinee && !pendingRequests.has(mKey)) {
          const p = fetchMartineeUnion().finally(() => pendingRequests.delete(mKey))
          pendingRequests.set(mKey, p as Promise<MartineeUnionRow[]>)
        }
        if (needsKpi && !pendingRequests.has(kKey)) {
          const p = fetchDailyKpi().finally(() => pendingRequests.delete(kKey))
          pendingRequests.set(kKey, p as Promise<DailyKpiRow[]>)
        }

        const [mData, kData] = await Promise.all([
          needsMartinee
            ? (pendingRequests.get(mKey) as Promise<MartineeUnionRow[]>)
            : Promise.resolve(cachedM!.data as MartineeUnionRow[]),
          needsKpi
            ? (pendingRequests.get(kKey) as Promise<DailyKpiRow[]>)
            : Promise.resolve(cachedK!.data as DailyKpiRow[]),
        ])

        if (needsMartinee) cache.set(mKey, { data: mData, fetchedAt: Date.now() })
        if (needsKpi) cache.set(kKey, { data: kData, fetchedAt: Date.now() })

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

  const allDates = [...martinee.map(r => r.date), ...kpi.map(r => r.date)].filter(Boolean).sort()

  const dateRange =
    allDates.length > 0
      ? { min: allDates[0], max: allDates[allDates.length - 1] }
      : null

  return { martinee, kpi, loading, error, dateRange }
}
