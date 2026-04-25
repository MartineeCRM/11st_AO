const ENDPOINT = import.meta.env.VITE_BRAZE_REST_ENDPOINT as string
const API_KEY = import.meta.env.VITE_BRAZE_API_KEY as string

const headers = {
  Authorization: `Bearer ${API_KEY}`,
}

export interface BrazeCampaign {
  id: string
  name: string
  is_active: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
  channels: string[]
  tags: string[]
}

export interface BrazeCampaignDetails {
  id: string
  name: string
  is_active: boolean
  schedule_type: string          // 'scheduled' | 'action_based' | 'api_triggered'
  channels: string[]
  tags: string[]
  created_at: string
  updated_at: string
  // Action-Based 전용
  trigger_type?: string
  trigger_action?: string
  // 성과 지표 (details API에 포함)
  messages?: Record<string, unknown>
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

/** 전체 캠페인 목록 (페이지 단위) */
export async function fetchCampaignList(page = 0): Promise<BrazeCampaign[]> {
  const url = `${ENDPOINT}/campaigns/list?page=${page}&include_archived=false`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`Braze /campaigns/list failed: ${res.status}`)
  const json = await res.json()
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
  const url = `${ENDPOINT}/campaigns/details?campaign_id=${campaignId}`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`Braze /campaigns/details failed: ${res.status}`)
  const json = await res.json()
  return json.campaign ?? json
}

/** 캠페인 데이터 분석 (series) — 최근 N일 */
export async function fetchCampaignDataSeries(
  campaignId: string,
  length = 14,
): Promise<{ time: string; messages?: Record<string, unknown> }[]> {
  const url = `${ENDPOINT}/campaigns/data_series?campaign_id=${campaignId}&length=${length}`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`Braze /campaigns/data_series failed: ${res.status}`)
  const json = await res.json()
  return json.data ?? []
}

/** 채널 레이블 한글화 */
export function channelLabel(channel: string): string {
  const map: Record<string, string> = {
    push: '푸시',
    email: '이메일',
    sms: 'SMS',
    in_app_message: '인앱',
    webhook: '웹훅',
    content_card: '콘텐츠카드',
    whats_app: 'WhatsApp',
    android_push: '푸시',
    ios_push: '푸시',
    kindle_push: '푸시',
  }
  return map[channel.toLowerCase()] ?? channel
}

/** 채널 뱃지 색상 */
export function channelBadgeColor(channel: string): { bg: string; text: string } {
  const c = channel.toLowerCase()
  if (c.includes('push')) return { bg: '#EEF2FF', text: '#4361EE' }
  if (c.includes('email')) return { bg: '#F0FDF4', text: '#15803D' }
  if (c.includes('sms')) return { bg: '#FEF3C7', text: '#D97706' }
  if (c.includes('in_app')) return { bg: '#EDE9FE', text: '#7C3AED' }
  if (c.includes('kakao')) return { bg: '#FEF9C3', text: '#A16207' }
  return { bg: '#F3F4F6', text: '#6B7280' }
}

/** schedule_type → 발송 유형 한글 */
export function scheduleTypeLabel(t: string): string {
  const map: Record<string, string> = {
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
