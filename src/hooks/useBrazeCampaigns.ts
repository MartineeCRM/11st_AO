import { useState, useEffect } from 'react'
import {
  fetchAllCampaigns,
  fetchCampaignDetails,
  type BrazeCampaign,
  type BrazeCampaignDetails,
} from '@/lib/braze'

export interface EnrichedCampaign extends BrazeCampaign {
  schedule_type: string
  trigger_action?: string
}

export interface UseBrazeCampaignsResult {
  campaigns: EnrichedCampaign[]
  loading: boolean
  error: string | null
}

const CACHE_TTL_MS = 3 * 60 * 1000

let cachedAt = 0
let cached: EnrichedCampaign[] = []

export function useBrazeCampaigns(): UseBrazeCampaignsResult {
  const [campaigns, setCampaigns] = useState<EnrichedCampaign[]>(cached)
  const [loading, setLoading] = useState(cached.length === 0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (Date.now() - cachedAt < CACHE_TTL_MS && cached.length > 0) {
      setCampaigns(cached)
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        // 1단계: 전체 목록 (active only)
        const list = await fetchAllCampaigns()
        const active = list.filter(c => c.is_active && !c.is_archived)

        // 2단계: 상세 정보 병렬 fetch (최대 50개, 과도한 요청 방지)
        const targets = active.slice(0, 50)
        const detailResults = await Promise.allSettled(
          targets.map(c => fetchCampaignDetails(c.id)),
        )

        const enriched: EnrichedCampaign[] = targets.map((c, i) => {
          const detail =
            detailResults[i].status === 'fulfilled'
              ? (detailResults[i] as PromiseFulfilledResult<BrazeCampaignDetails>).value
              : null
          return {
            ...c,
            schedule_type: detail?.schedule_type ?? 'unknown',
            trigger_action: detail?.trigger_action,
          }
        })

        if (!cancelled) {
          cached = enriched
          cachedAt = Date.now()
          setCampaigns(enriched)
          setLoading(false)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Braze API 오류')
          setLoading(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return { campaigns, loading, error }
}
