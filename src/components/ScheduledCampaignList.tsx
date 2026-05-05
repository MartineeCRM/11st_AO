import { useState } from 'react'
import { Calendar, ExternalLink, Clock, ChevronDown } from 'lucide-react'
import { channelLabel, channelBadgeColor, brazeCampaignUrl } from '@/lib/braze'
import type { EnrichedCampaign } from '@/hooks/useBrazeCampaigns'

function formatDateTime(iso: string | undefined): { date: string; time: string } | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  const date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return { date, time }
}

function getRelevantDate(c: EnrichedCampaign): string | undefined {
  // first_sent > last_sent > updated_at 순으로 사용
  return c.first_sent || c.last_sent || c.updated_at
}

function groupByDate(campaigns: EnrichedCampaign[]): Map<string, EnrichedCampaign[]> {
  const map = new Map<string, EnrichedCampaign[]>()
  for (const c of campaigns) {
    const dt = formatDateTime(getRelevantDate(c))
    const key = dt?.date ?? '날짜 미정'
    const list = map.get(key) ?? []
    list.push(c)
    map.set(key, list)
  }
  return map
}

const INITIAL_SHOW = 5

interface Props {
  campaigns: EnrichedCampaign[]
  loading: boolean
  error: string | null
}

export function ScheduledCampaignList({ campaigns, loading, error }: Props) {
  const [expanded, setExpanded] = useState(false)

  const scheduled = campaigns
    .filter(c => c.schedule_type === 'time_based' || c.schedule_type === 'scheduled')
    .sort((a, b) => (getRelevantDate(b) ?? '').localeCompare(getRelevantDate(a) ?? ''))

  const visible = expanded ? scheduled : scheduled.slice(0, INITIAL_SHOW)
  const grouped = groupByDate(visible)
  const hasMore = scheduled.length > INITIAL_SHOW

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white">
      <div className="flex items-center gap-2 border-b border-[#F3F4F6] px-6 py-3.5">
        <Calendar className="h-4 w-4 text-[#4361EE]" />
        <span className="text-sm font-semibold text-[#111827]">Scheduled 캠페인 현황</span>
        {!loading && (
          <span className="ml-1 rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-bold text-[#4361EE]">
            {scheduled.length}
          </span>
        )}
        <span className="ml-auto text-[11px] text-[#9CA3AF]">최근 발송 순</span>
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

      {!loading && !error && scheduled.length === 0 && (
        <div className="px-6 py-8 text-center text-xs text-[#9CA3AF]">
          라이브 중인 Scheduled 캠페인이 없습니다.
        </div>
      )}

      {!loading && !error && scheduled.length > 0 && (
        <div className="px-6 py-4 flex flex-col gap-6">
          {[...grouped.entries()].map(([date, items]) => (
            <div key={date} className="flex gap-4">
              {/* 날짜 레이블 */}
              <div className="w-24 shrink-0 pt-0.5">
                <span className="text-[11px] font-semibold text-[#6B7280]">{date}</span>
              </div>

              {/* 타임라인 */}
              <div className="flex flex-col gap-0 flex-1 relative">
                {/* 세로 선 */}
                <div className="absolute left-[5px] top-2 bottom-2 w-px bg-[#E5E7EB]" />

                {items.map((c, idx) => {
                  const dt = formatDateTime(getRelevantDate(c))
                  const primaryChannel = c.channels[0] ?? ''
                  const badge = channelBadgeColor(primaryChannel)
                  return (
                    <div key={c.id} className="flex items-start gap-3 py-2">
                      {/* 타임라인 도트 */}
                      <div className="relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-[#4361EE] bg-white" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* 시간 */}
                          {dt && (
                            <div className="flex items-center gap-1 text-[11px] text-[#9CA3AF] tabular-nums">
                              <Clock className="h-3 w-3" />
                              {dt.time}
                            </div>
                          )}
                          {/* 채널 뱃지 */}
                          <div
                            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
                            style={{ backgroundColor: badge.bg, color: badge.text }}
                          >
                            {channelLabel(primaryChannel) || '기타'}
                          </div>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <p className="truncate text-xs font-medium text-[#111827]">{c.name}</p>
                          <a
                            href={brazeCampaignUrl(c.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-[#9CA3AF] hover:text-[#4361EE]"
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
          ))}

          {hasMore && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center justify-center gap-1 rounded-lg border border-[#E5E7EB] py-2 text-xs text-[#6B7280] hover:bg-[#F9FAFB]"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              {expanded ? '접기' : `${scheduled.length - INITIAL_SHOW}개 더 보기`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
