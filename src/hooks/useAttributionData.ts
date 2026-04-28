import { useState, useEffect, useRef } from 'react'
import { fetchAttData } from '@/lib/googleSheets'
import { offsetDate } from '@/lib/attributionMetrics'
import type { AttDataRow } from '@/types/sheets'

const CACHE_TTL_MS = 5 * 60 * 1000

interface CacheEntry {
  data: AttDataRow[]
  fetchedAt: number
}

let cache: CacheEntry | undefined
let pendingRequest: Promise<AttDataRow[]> | undefined

export interface AttributionData {
  rows: AttDataRow[]       // 전체 rows (WoW/MoM 계산용 확장 범위 포함)
  loading: boolean
  error: string | null
  dateRange: { min: string; max: string } | null
}

/** ATT_DATA 시트를 fetch. 날짜 필터는 클라이언트에서 적용. */
export function useAttributionData(): AttributionData {
  const [rows, setRows] = useState<AttDataRow[]>([])
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
        const needsFetch = !cache || now - cache.fetchedAt > CACHE_TTL_MS

        if (needsFetch && !pendingRequest) {
          pendingRequest = fetchAttData().finally(() => {
            pendingRequest = undefined
          })
        }

        const data = needsFetch
          ? await pendingRequest!
          : cache!.data

        if (needsFetch) cache = { data, fetchedAt: Date.now() }

        if (mounted.current) setRows(data)
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

  const dates = rows.map(r => r.date).filter(Boolean).sort()
  const dateRange = dates.length > 0
    ? { min: dates[0], max: dates[dates.length - 1] }
    : null

  return { rows, loading, error, dateRange }
}

/**
 * WoW/MoM 계산을 위해 사용자 선택 날짜 범위보다 30일 앞까지의 rows를 반환.
 * 컴포넌트에서 필터링 후 이 함수로 확장 범위 rows를 가져간다.
 */
export function getExtendedRows(rows: AttDataRow[], startDate: string): AttDataRow[] {
  const extendedStart = offsetDate(startDate, -30)
  return rows.filter(r => r.date >= extendedStart)
}
