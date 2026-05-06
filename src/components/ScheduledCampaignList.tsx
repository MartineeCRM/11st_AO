import { useState } from 'react'
import { Calendar, ExternalLink, ChevronDown } from 'lucide-react'
import { channelLabel, channelBadgeColor, brazeCampaignUrl } from '@/lib/braze'
import type { EnrichedCampaign } from '@/hooks/useBrazeCampaigns'

function formatDateTime(iso: string | undefined): { date: string; time: string; sortKey: string } | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  const date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return { date, time, sortKey: d.toISOString() }
}

function getRelevantDate(c: EnrichedCampaign): string | undefined {
  return c.first_sent || c.last_sent || c.updated_at
}

function dayDiff(iso: string): number {
  const d = new Date(iso)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - now.getTime()) / 86400000)
}

const INITIAL_SHOW = 12

interface Props {
  campaigns: EnrichedCampaign[]
  loading: boolean
  error: string | null
}

export function ScheduledCampaignList({ campaigns, loading, error }: Props) {
  const [expanded, setExpanded] = useState(false)

  // 현재 날짜에 가장 가까운 날짜 순 (오름차순 — 과거→미래)
  const scheduled = campaigns
    .filter(c => c.schedule_type === 'time_based' || c.schedule_type === 'scheduled')
    .sort((a, b) => {
      const da = getRelevantDate(a) ?? ''
      const db = getRelevantDate(b) ?? ''
      return da.localeCompare(db)
    })

  // 오늘 기준으로 가장 가까운 날짜부터 — 과거는 최신, 미래는 임박한 것 우선
  const now = new Date().toISOString()
  const past = scheduled.filter(c => (getRelevantDate(c) ?? '') <= now).reverse()
  const future = scheduled.filter(c => (getRelevantDate(c) ?? '') > now)
  const sorted = [...future, ...past]

  const visible = expanded ? sorted : sorted.slice(0, INITIAL_SHOW)
  const hasMore = sorted.length > INITIAL_SHOW

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white">
      <div className="flex items-center gap-2 border-b border-[#F3F4F6] px-6 py-3.5">
        <Calendar className="h-4 w-4 text-[#4361EE]" />
        <span className="text-sm font-semibold text-[#111827]">Scheduled 캠페인 현황</span>
        {!loading && (
          <span className="ml-1 rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-bold text-[#4361EE]">
            {sorted.length}
          </span>
        )}
        <span className="ml-auto text-[11px] text-[#9CA3AF]">가까운 날짜 순</span>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#4361EE] border-t-transparent" />
          <span className="ml-2 text-xs text-[#6B7280]">Braze 연동 중...</span>
        </div>
      )}

      {error && !loading && (
        <div className="px-6 py-4 text-xs text-[#EF4444]">Braze 오류: {error}</div>
      )}

      {!loading && !error && sorted.length === 0 && (
        <div className="px-6 py-8 text-center text-xs text-[#9CA3AF]">
          Scheduled 캠페인이 없습니다.
        </div>
      )}

      {!loading && !error && sorted.length > 0 && (
        <div className="px-6 py-4 flex flex-col gap-2">
          {/* 가로형 타임라인 */}
          <div className="relative">
            {/* 세로 연결선 */}
            <div className="absolute left-[7px] top-0 bottom-0 w-0.5 bg-[#E5E7EB]" />

            <div className="flex flex-col gap-0">
              {visible.map((c) => {
                const dt = formatDateTime(getRelevantDate(c))
                const primaryChannel = c.channels[0] ?? ''
                const badge = channelBadgeColor(primaryChannel)
                const diff = dt ? dayDiff(getRelevantDate(c)!) : null
                const isFuture = diff !== null && diff >= 0
                const isPast = diff !== null && diff < 0

                let diffLabel = ''
                if (diff !== null) {
                  if (diff === 0) diffLabel = '오늘'
                  else if (diff === 1) diffLabel = 'D-1'
                  else if (diff > 1) diffLabel = `D-${diff}`
                  else diffLabel = `${Math.abs(diff)}일 전`
                }

                return (
                  <div key={c.id} className="flex items-start gap-3 py-2.5 group">
                    {/* 타임라인 도트 */}
                    <div className={`relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 ${isFuture ? 'border-[#4361EE] bg-[#4361EE]' : isPast ? 'border-[#D1D5DB] bg-white' : 'border-[#4361EE] bg-white'}`} />

                    {/* 내용 — 가로 배치 */}
                    <div className="flex flex-1 min-w-0 items-center gap-3 flex-wrap">
                      {/* 날짜 + 시간 */}
                      <div className="shrink-0 w-36 tabular-nums">
                        {dt ? (
                          <span className="text-xs text-[#374151] font-medium">{dt.date}</span>
                        ) : (
                          <span className="text-xs text-[#9CA3AF]">날짜 미정</span>
                        )}
                        {dt && (
                          <span className="ml-1.5 text-[11px] text-[#9CA3AF]">{dt.time}</span>
                        )}
                      </div>

                      {/* D-day 뱃지 */}
                      {diffLabel && (
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${isFuture ? 'bg-[#EEF2FF] text-[#4361EE]' : 'bg-[#F3F4F6] text-[#9CA3AF]'}`}>
                          {diffLabel}
                        </span>
                      )}

                      {/* 채널 뱃지 */}
                      <div
                        className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: badge.bg, color: badge.text }}
                      >
                        {channelLabel(primaryChannel) || '기타'}
                      </div>

                      {/* 캠페인 이름 */}
                      <div className="flex flex-1 min-w-0 items-center gap-1.5">
                        <p className="truncate text-xs text-[#111827]">{c.name}</p>
                        <a
                          href={brazeCampaignUrl(c.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-[#9CA3AF] hover:text-[#4361EE] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {hasMore && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="mt-1 flex items-center justify-center gap-1 rounded-lg border border-[#E5E7EB] py-2 text-xs text-[#6B7280] hover:bg-[#F9FAFB]"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              {expanded ? '접기' : `${sorted.length - INITIAL_SHOW}개 더 보기`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
