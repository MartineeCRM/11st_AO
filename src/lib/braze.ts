const REQUIRED_PERMISSIONS: Record<string, string> = {
  '/campaigns/list': 'campaigns.list',
  '/campaigns/details': 'campaigns.details',
  '/campaigns/data_series': 'campaigns.data_series',
}

function buildUrl(path: string, params: Record<string, string | number | boolean>) {
  const url = new URL(`/api/braze${path}`, window.location.origin)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value))
  })
  return url.toString()
}

async function parseErrorBody(res: Response) {
  const text = await res.text().catch(() => '')
  if (!text) return ''

  try {
    const json = JSON.parse(text) as { message?: unknown; error?: unknown; errors?: unknown }
    return String(json.message ?? json.error ?? json.errors ?? text)
  } catch {
    return text
  }
}

async function brazeGet<T>(path: string, params: Record<string, string | number | boolean>, label: string): Promise<T> {
  const res = await fetch(buildUrl(path, params))

  if (!res.ok) {
    const body = await parseErrorBody(res)
    const requiredPermission = REQUIRED_PERMISSIONS[path]
    const permissionHint =
      res.status === 403 && requiredPermission
        ? `; required Braze permission: ${requiredPermission}`
        : ''
    const bodyHint = body ? ` (${body})` : ''
    throw new Error(`${label} failed: ${res.status}${bodyHint}${permissionHint}`)
  }

  return res.json() as Promise<T>
}

export interface BrazeCampaign {
  id: string
  name: string
  is_api_campaign: boolean
  last_edited: string
  tags: string[]
}

export interface BrazeCampaignDetails {
  id?: string
  name: string
  archived: boolean
  enabled: boolean
  draft: boolean
  schedule_type: string          // 'time_based' | 'action_based' | 'api_triggered'
  channels: string[]
  tags: string[]
  created_at: string
  updated_at: string
  // Action-Based 전용 — Braze API는 triggers 배열로 반환
  trigger_type?: string
  trigger_action?: string
  triggers?: Array<{
    trigger_type?: string
    trigger_action?: string
    event_name?: string
    event_type?: string
  }>
  // 발송 스케줄 (Scheduled 캠페인)
  first_sent?: string
  last_sent?: string
  // 성과 지표 (details API에 포함)
  messages?: Record<string, unknown>
  // 스케줄 상세 (Braze API 원본 그대로 보존)
  schedule?: Record<string, unknown>
}

export interface BrazeCampaignStats {
  campaign_id: string
  name: string
  stats: {
    sent: number
    delivered: number
    opens: number
    clicks: number
    conversions: number
    revenue: number
    unique_recipients: number
  }
}

interface CampaignListResponse {
  campaigns?: BrazeCampaign[]
}

interface CampaignDetailsResponse extends BrazeCampaignDetails {
  campaign?: BrazeCampaignDetails
}

interface CampaignDataSeriesResponse {
  data?: { time: string; messages?: Record<string, unknown> }[]
}

/** 전체 캠페인 목록 (페이지 단위) */
export async function fetchCampaignList(page = 0): Promise<BrazeCampaign[]> {
  const json = await brazeGet<CampaignListResponse>(
    '/campaigns/list',
    { page, include_archived: false, sort_direction: 'desc' },
    'Braze /campaigns/list',
  )
  return json.campaigns ?? []
}

/** 전체 캠페인 목록 — 모든 페이지 합산 (최대 500개) */
export async function fetchAllCampaigns(): Promise<BrazeCampaign[]> {
  const results: BrazeCampaign[] = []
  let page = 0
  while (true) {
    const batch = await fetchCampaignList(page)
    results.push(...batch)
    if (batch.length < 100) break   // 100개 미만이면 마지막 페이지
    if (results.length >= 500) break // 안전 상한
    page++
  }
  return results
}

/** 특정 캠페인 상세 (schedule_type, trigger_action 포함) */
export async function fetchCampaignDetails(campaignId: string): Promise<BrazeCampaignDetails> {
  const json = await brazeGet<CampaignDetailsResponse>(
    '/campaigns/details',
    { campaign_id: campaignId },
    'Braze /campaigns/details',
  )
  return json.campaign ?? json
}

/** 캠페인 데이터 분석 (series) — 최근 N일 */
export async function fetchCampaignDataSeries(
  campaignId: string,
  length = 14,
): Promise<{ time: string; messages?: Record<string, unknown> }[]> {
  const json = await brazeGet<CampaignDataSeriesResponse>(
    '/campaigns/data_series',
    { campaign_id: campaignId, length },
    'Braze /campaigns/data_series',
  )
  return json.data ?? []
}

/** 채널 레이블 한글화 */
export function channelLabel(channel: string): string {
  const map: Record<string, string> = {
    push: '푸시',
    android_push: '푸시',
    ios_push: '푸시',
    kindle_push: '푸시',
    email: '이메일',
    sms: 'SMS',
    in_app_message: '인앱',
    trigger_in_app_message: '인앱',
    webhook: '웹훅',
    content_card: '콘텐츠카드',
    whats_app: 'WhatsApp',
  }
  return map[channel.toLowerCase()] ?? channel
}

/** 채널 뱃지 색상 */
export function channelBadgeColor(channel: string): { bg: string; text: string } {
  const c = channel.toLowerCase()
  if (c.includes('push')) return { bg: '#e8f0fb', text: '#0066cc' }
  if (c.includes('in_app_message')) return { bg: '#EDE9FE', text: '#7C3AED' }
  if (c.includes('email')) return { bg: '#F0FDF4', text: '#15803D' }
  if (c.includes('sms')) return { bg: '#FEF3C7', text: '#D97706' }
  if (c.includes('kakao')) return { bg: '#FEF9C3', text: '#A16207' }
  if (c.includes('webhook')) return { bg: '#F1F5F9', text: '#475569' }
  return { bg: '#F3F4F6', text: '#6B7280' }
}

/** schedule_type → 발송 유형 한글 */
export function scheduleTypeLabel(t: string): string {
  const map: Record<string, string> = {
    time_based: 'Scheduled',
    scheduled: 'Scheduled',
    action_based: 'Action-Based',
    api_triggered: 'API Triggered',
  }
  return map[t] ?? t
}

/** Braze 캠페인 대시보드 URL */
export function brazeCampaignUrl(campaignId: string): string {
  return `https://dashboard-07.braze.com/engagement/campaigns/${campaignId}`
}
