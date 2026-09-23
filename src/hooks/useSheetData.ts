import { useEffect, useRef, useState } from 'react'
import { fetchAoPushRows } from '@/lib/googleSheets'
import type { AoPushRow } from '@/types/sheets'
import type { SheetConnection } from './useSheetConnectionState'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5분

interface CacheEntry {
  data: AoPushRow[]
  fetchedAt: number
}

// 연결 정보(스프레드시트ID+시트명)별로 캐시를 분리 — 사용자가 설정에서 연결을 바꾸면
// 새로 fetch하고, 같은 연결로 돌아오면 캐시를 재사용한다.
const cache = new Map<string, CacheEntry>()
const pending = new Map<string, Promise<AoPushRow[]>>()

function cacheKeyOf(connection: SheetConnection): string {
  return `${connection.spreadsheetId}::${connection.sheetName}`
}

export interface SheetData {
  rows: AoPushRow[]
  loading: boolean
  error: string | null
  /** 전체 기간 (수신/오픈 등 모든 원본 행 기준, AO 필터 적용 전) */
  dateRange: { min: string; max: string } | null
}

export function useSheetData(connection: SheetConnection): SheetData {
  const [rows, setRows] = useState<AoPushRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    const key = cacheKeyOf(connection)

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const now = Date.now()
        const cached = cache.get(key)
        const needsFetch = !cached || now - cached.fetchedAt > CACHE_TTL_MS

        if (needsFetch && !pending.has(key)) {
          pending.set(key, fetchAoPushRows(connection).finally(() => { pending.delete(key) }))
        }

        const data = needsFetch ? await pending.get(key)! : cached!.data
        if (needsFetch) cache.set(key, { data, fetchedAt: Date.now() })

        if (mounted.current) setRows(data)
      } catch (err) {
        if (mounted.current) setError(err instanceof Error ? err.message : '데이터 로드 실패')
      } finally {
        if (mounted.current) setLoading(false)
      }
    }

    void load()
    return () => { mounted.current = false }
  }, [connection.spreadsheetId, connection.sheetName, connection.apiKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // fetchAoPushRows가 날짜 오름차순으로 정렬해 반환하므로 첫/끝 원소로 min/max를 구할 수 있음
  // (단, 빈 일자 셀이 있는 행은 정렬 시 맨 앞으로 오므로 min/max 계산 전에 제외해야 함)
  const dated = rows.filter(r => r.date)
  const dateRange = dated.length > 0
    ? { min: dated[0].date, max: dated[dated.length - 1].date }
    : null

  return { rows, loading, error, dateRange }
}
