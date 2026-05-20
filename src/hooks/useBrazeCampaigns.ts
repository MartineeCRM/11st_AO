import { useState, useEffect } from 'react'
import {
  fetchAllCampaigns,
  fetchCampaignDetails,
  fetchAllCanvases,
  fetchCanvasDetails,
  resolveCanvasScheduleType,
  extractCanvasChannels,
  type BrazeCampaign,
  type BrazeCampaignDetails,
  type BrazeCanvasDetails,
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
  type: 'campaign' | 'canvas'
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
  first_sent?: string
  last_sent?: string
  schedule?: { time?: string; next_send_time?: string; start_time?: string; [key: string]: unknown }
}

export interface UseBrazeCampaignsResult {
  campaigns: EnrichedCampaign[]
  loading: boolean
  error: string | null
}

const CACHE_TTL_MS = 3 * 60 * 1000
const DETAIL_LIMIT = 100
const DETAIL_CONCURRENCY = 8

interface CacheSlot {
  data: EnrichedCampaign[]
  cachedAt: number
  pending?: Promise<EnrichedCampaign[]>
}
const cache = new Map<string, CacheSlot>()

function getProjectId(): string {
  return localStorage.getItem('crm_project_id') ?? 'default'
}

async function fetchDetailsWithConcurrency(
  items: BrazeCampaign[],
  fetcher: (id: string) => Promise<BrazeCampaignDetails>,
): Promise<PromiseSettledResult<BrazeCampaignDetails>[]> {
  const results: PromiseSettledResult<BrazeCampaignDetails>[] = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      try {
        results[index] = {
          status: 'fulfilled',
          value: await fetcher(items[index].id),
        }
      } catch (reason) {
        results[index] = { status: 'rejected', reason }
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(DETAIL_CONCURRENCY, items.length) }, () => worker()),
  )
  return results
}

async function fetchLiveCampaigns(): Promise<EnrichedCampaign[]> {
  // Campaign과 Canvas 목록을 병렬로 가져옴
  const [campaignList, canvasList] = await Promise.all([
    fetchAllCampaigns().catch(() => [] as BrazeCampaign[]),
    fetchAllCanvases().catch(() => [] as BrazeCampaign[]),
  ])

  // Campaign 상세 fetch
  const campaignTargets = campaignList.slice(0, DETAIL_LIMIT)
  const campaignDetailResults = await fetchDetailsWithConcurrency(campaignTargets, fetchCampaignDetails)

  const enrichedCampaigns: EnrichedCampaign[] = campaignTargets.flatMap((c, i) => {
    const detail =
      campaignDetailResults[i].status === 'fulfilled'
        ? (campaignDetailResults[i] as PromiseFulfilledResult<BrazeCampaignDetails>).value
        : null
    if (!detail) return []
    const isLive = detail.enabled && !detail.archived && !detail.draft
    if (!isLive) return []
    return [{
      ...c,
      type: 'campaign' as const,
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
      first_sent: detail.first_sent,
      last_sent: detail.last_sent,
      schedule: detail.schedule,
    }]
  })

  // Canvas 상세 fetch — fetchDetailsWithConcurrency는 BrazeCampaign[] 기대하므로 id/name 호환됨
  const canvasTargets = canvasList.slice(0, DETAIL_LIMIT)
  const canvasDetailResults = await fetchDetailsWithConcurrency(canvasTargets, fetchCanvasDetails)

  const enrichedCanvases: EnrichedCampaign[] = canvasTargets.flatMap((c, i) => {
    const raw =
      canvasDetailResults[i].status === 'fulfilled'
        ? (canvasDetailResults[i] as PromiseFulfilledResult<BrazeCanvasDetails>).value
        : null
    if (!raw) return []
    const isLive = raw.enabled && !raw.archived && !raw.draft
    if (!isLive) return []
    const scheduleType = resolveCanvasScheduleType(raw)
    return [{
      ...c,
      type: 'canvas' as const,
      name: raw.name || c.name,
      schedule_type: scheduleType,
      channels: extractCanvasChannels(raw),
      created_at: raw.created_at,
      updated_at: raw.updated_at,
      tags: raw.tags ?? c.tags,
      enabled: raw.enabled,
      archived: raw.archived,
      draft: raw.draft,
      is_active: isLive,
      is_archived: raw.archived,
      trigger_action: resolveTriggerAction(raw),
      first_sent: raw.first_sent,
      last_sent: raw.last_sent,
      schedule: raw.schedule as Record<string, unknown> | undefined,
    }]
  })

  return [...enrichedCampaigns, ...enrichedCanvases]
}

export function useBrazeCampaigns(): UseBrazeCampaignsResult {
  const pid = getProjectId()
  const slot = cache.get(pid)
  const [campaigns, setCampaigns] = useState<EnrichedCampaign[]>(slot?.data ?? [])
  const [loading, setLoading] = useState(!slot || slot.data.length === 0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const pid = getProjectId()
    const slot = cache.get(pid)

    if (slot && Date.now() - slot.cachedAt < CACHE_TTL_MS && slot.data.length > 0) {
      setCampaigns(slot.data)
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const current = cache.get(pid) ?? { data: [], cachedAt: 0 }
        if (!current.pending) {
          current.pending = fetchLiveCampaigns().finally(() => {
            const s = cache.get(pid)
            if (s) delete s.pending
          })
          cache.set(pid, current)
        }
        const enriched = await current.pending!

        if (!cancelled) {
          cache.set(pid, { data: enriched, cachedAt: Date.now() })
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
  }, [pid])

  return { campaigns, loading, error }
}
