import { useState, useEffect } from 'react'
import {
  fetchAllCampaigns,
  fetchCampaignDetails,
  type BrazeCampaign,
  type BrazeCampaignDetails,
} from '@/lib/braze'

/**
 * Braze /campaigns/details 응답에서 트리거 이벤트명을 추출한다.
 * API는 최상위 trigger_action 또는 triggers 배열 중 하나로 반환할 수 있다.
 */
function resolveTriggerAction(detail: BrazeCampaignDetails): string | undefined {
  // 최상위 필드가 있으면 우선 사용
  if (detail.trigger_action) return detail.trigger_action

  // triggers 배열에서 첫 번째 항목의 event_name → trigger_action 순으로 추출
  const first = detail.triggers?.[0]
  if (!first) return undefined

  return first.event_name ?? first.trigger_action ?? first.trigger_type ?? undefined
}

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
const DETAIL_CONCURRENCY = 8

let cachedAt = 0
let cached: EnrichedCampaign[] = []
let pendingRequest: Promise<EnrichedCampaign[]> | undefined

async function fetchDetailsWithConcurrency(
  campaigns: BrazeCampaign[],
): Promise<PromiseSettledResult<BrazeCampaignDetails>[]> {
  const results: PromiseSettledResult<BrazeCampaignDetails>[] = new Array(campaigns.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < campaigns.length) {
      const index = nextIndex
      nextIndex += 1
      try {
        results[index] = {
          status: 'fulfilled',
          value: await fetchCampaignDetails(campaigns[index].id),
        }
      } catch (reason) {
        results[index] = { status: 'rejected', reason }
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(DETAIL_CONCURRENCY, campaigns.length) }, () => worker()),
  )
  return results
}

async function fetchLiveCampaigns(): Promise<EnrichedCampaign[]> {
  // 1단계: 전체 목록. /campaigns/list에는 활성 상태와 채널 정보가 없다.
  const list = await fetchAllCampaigns()

  // 2단계: 최신 캠페인 상세 정보 fetch. 동시성을 제한해 rate limit과 네트워크 병목을 피한다.
  const targets = list.slice(0, DETAIL_LIMIT)
  const detailResults = await fetchDetailsWithConcurrency(targets)

  return targets.flatMap((c, i) => {
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
      trigger_action: resolveTriggerAction(detail),
    }
  })
}

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
        pendingRequest ??= fetchLiveCampaigns().finally(() => {
          pendingRequest = undefined
        })
        const enriched = await pendingRequest

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
