import { useState, useEffect, useRef } from 'react'
import { fetchAoPushRows } from '@/lib/googleSheets'
import type { AoPushRow } from '@/types/sheets'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5분

interface CacheEntry {
  data: AoPushRow[]
  fetchedAt: number
}

let cache: CacheEntry | null = null
let pending: Promise<AoPushRow[]> | null = null

export interface SheetData {
  rows: AoPushRow[]
  loading: boolean
  error: string | null
  /** 전체 기간 (수신/오픈 등 모든 원본 행 기준, AO 필터 적용 전) */
  dateRange: { min: string; max: string } | null
}

export function useSheetData(): SheetData {
  const [rows, setRows] = useState<AoPushRow[]>([])
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

        if (needsFetch && !pending) {
          pending = fetchAoPushRows().finally(() => { pending = null })
        }

        const data = needsFetch ? await pending! : cache!.data
        if (needsFetch) cache = { data, fetchedAt: Date.now() }

        if (mounted.current) setRows(data)
      } catch (err) {
        if (mounted.current) setError(err instanceof Error ? err.message : '데이터 로드 실패')
      } finally {
        if (mounted.current) setLoading(false)
      }
    }

    void load()
    return () => { mounted.current = false }
  }, [])

  // fetchAoPushRows가 날짜 오름차순으로 정렬해 반환하므로 첫/끝 원소로 min/max를 구할 수 있음
  // (단, 빈 일자 셀이 있는 행은 정렬 시 맨 앞으로 오므로 min/max 계산 전에 제외해야 함)
  const dated = rows.filter(r => r.date)
  const dateRange = dated.length > 0
    ? { min: dated[0].date, max: dated[dated.length - 1].date }
    : null

  return { rows, loading, error, dateRange }
}
