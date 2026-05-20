import { useState, useEffect, useRef } from 'react'
import { fetchMartineeUnion, fetchDailyKpiWithHeaders } from '@/lib/googleSheets'
import type { MartineeUnionRow, DailyKpiRow } from '@/types/sheets'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5분

interface CacheEntry<T> {
  data: T
  fetchedAt: number
}

interface KpiCacheData {
  rows: DailyKpiRow[]
  eventColumns: { key: string; label: string }[]
}

// 캐시 키에 project_id 포함 — 프로젝트 전환 시 다른 슬롯 사용
type MarineeKey = `${string}:martinee`
type KpiKey = `${string}:kpi`
const martineeCache = new Map<MarineeKey, CacheEntry<MartineeUnionRow[]>>()
const kpiCache = new Map<KpiKey, CacheEntry<KpiCacheData>>()
const pendingMartinee = new Map<MarineeKey, Promise<MartineeUnionRow[]>>()
const pendingKpi = new Map<KpiKey, Promise<KpiCacheData>>()

function getProjectId(): string {
  return localStorage.getItem('crm_project_id') ?? 'default'
}

export interface SheetData {
  martinee: MartineeUnionRow[]
  kpi: DailyKpiRow[]
  kpiEventColumns: { key: string; label: string }[]
  loading: boolean
  error: string | null
  /** 전체 기간 */
  dateRange: { min: string; max: string } | null
}

export function useSheetData(): SheetData {
  const [martinee, setMartinee] = useState<MartineeUnionRow[]>([])
  const [kpi, setKpi] = useState<DailyKpiRow[]>([])
  const [kpiEventColumns, setKpiEventColumns] = useState<{ key: string; label: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)
  const pid = getProjectId()

  useEffect(() => {
    mounted.current = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const now = Date.now()
        const mKey: MarineeKey = `${pid}:martinee`
        const kKey: KpiKey = `${pid}:kpi`

        const cachedM = martineeCache.get(mKey)
        const cachedK = kpiCache.get(kKey)
        const needsMartinee = !cachedM || now - cachedM.fetchedAt > CACHE_TTL_MS
        const needsKpi = !cachedK || now - cachedK.fetchedAt > CACHE_TTL_MS

        if (needsMartinee && !pendingMartinee.has(mKey)) {
          const p = fetchMartineeUnion().finally(() => pendingMartinee.delete(mKey))
          pendingMartinee.set(mKey, p)
        }
        if (needsKpi && !pendingKpi.has(kKey)) {
          const p = fetchDailyKpiWithHeaders().finally(() => pendingKpi.delete(kKey))
          pendingKpi.set(kKey, p)
        }

        const [mData, kData] = await Promise.all([
          needsMartinee
            ? (pendingMartinee.get(mKey) as Promise<MartineeUnionRow[]>)
            : Promise.resolve(cachedM!.data),
          needsKpi
            ? (pendingKpi.get(kKey) as Promise<KpiCacheData>)
            : Promise.resolve(cachedK!.data),
        ])

        if (needsMartinee) martineeCache.set(mKey, { data: mData, fetchedAt: Date.now() })
        if (needsKpi) kpiCache.set(kKey, { data: kData, fetchedAt: Date.now() })

        if (mounted.current) {
          setMartinee(mData)
          setKpi(kData.rows)
          setKpiEventColumns(kData.eventColumns)
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
  }, [pid])

  const allDates = [...martinee.map(r => r.date), ...kpi.map(r => r.date)].filter(Boolean).sort()

  const dateRange =
    allDates.length > 0
      ? { min: allDates[0], max: allDates[allDates.length - 1] }
      : null

  return { martinee, kpi, kpiEventColumns, loading, error, dateRange }
}
