import { useState, useEffect } from 'react'
import {
  fetchAllCampaigns,
  fetchCampaignDetails,
  type BrazeCampaign,
  type BrazeCampaignDetails,
} from '@/lib/braze'

export interface EnrichedCampaign extends BrazeCampaign {
  schedule_type: string
  channels: string[]
  created_at: string
  updated_at: string
  enabled: boolean
  archived: boolean
  draft: boolean
  is_active: boolean
  is_archived: boolean
  trigger_action?: string
}

export interface UseBrazeCampaignsResult {
  campaigns: EnrichedCampaign[]
  loading: boolean
  error: string | null
}

const CACHE_TTL_MS = 3 * 60 * 1000
const DETAIL_LIMIT = 100

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
        // 1단계: 전체 목록. /campaigns/list에는 활성 상태와 채널 정보가 없다.
        const list = await fetchAllCampaigns()

        // 2단계: 최신 캠페인 상세 정보 병렬 fetch (과도한 요청 방지)
        const targets = list.slice(0, DETAIL_LIMIT)
        const detailResults = await Promise.allSettled(
          targets.map(c => fetchCampaignDetails(c.id)),
        )

        const enriched: EnrichedCampaign[] = targets.flatMap((c, i) => {
          const detail =
            detailResults[i].status === 'fulfilled'
              ? (detailResults[i] as PromiseFulfilledResult<BrazeCampaignDetails>).value
              : null

          if (!detail) return []

          const isLive = detail.enabled && !detail.archived && !detail.draft
          if (!isLive) return []

          return {
            ...c,
            name: detail.name || c.name,
            schedule_type: detail.schedule_type ?? 'unknown',
            channels: detail.channels ?? [],
            created_at: detail.created_at,
            updated_at: detail.updated_at,
            tags: detail.tags ?? c.tags,
            enabled: detail.enabled,
            archived: detail.archived,
            draft: detail.draft,
            is_active: isLive,
            is_archived: detail.archived,
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
