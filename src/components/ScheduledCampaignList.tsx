import { Calendar, ExternalLink } from 'lucide-react'
import { ChartSectionNote } from './charts/ChartSectionNote'
import { channelLabel, channelBadgeColor, brazeCampaignUrl, brazeCanvasUrl } from '@/lib/braze'
import type { EnrichedCampaign } from '@/hooks/useBrazeCampaigns'

function getRelevantDate(c: EnrichedCampaign): string | undefined {
  const scheduledTime = c.schedule?.next_send_time ?? c.schedule?.time ?? c.schedule?.start_time
  if (scheduledTime) return scheduledTime
  return c.first_sent || c.last_sent || c.updated_at
}

function toLocalTimeKey(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${date} ${time}`
}

function toLocalDateKey(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dateLabel(timeKey: string): string {
  const [datePart] = timeKey.split(' ')
  const [, m, d] = datePart.split('-')
  return `${Number(m)}/${Number(d)}`
}

function timeLabel(timeKey: string): string {
  const parts = timeKey.split(' ')
  return parts[1] ?? ''
}

function dayDiffFromTimeKey(timeKey: string): number {
  const today = todayKey()
  const datePart = timeKey.split(' ')[0]
  const a = new Date(today).getTime()
  const b = new Date(datePart).getTime()
  return Math.round((b - a) / 86400000)
}

function dDayLabel(diff: number): string {
  if (diff === 0) return '오늘'
  if (diff > 0) return `D-${diff}`
  return `${Math.abs(diff)}일 전`
}

interface Props {
  campaigns: EnrichedCampaign[]
  loading: boolean
  error: string | null
  brazeBaseUrl?: string | null
}

export function ScheduledCampaignList({ campaigns, loading, error, brazeBaseUrl }: Props) {
  const today = todayKey()

  const scheduled = campaigns
    .filter(c => c.schedule_type === 'time_based' || c.schedule_type === 'scheduled')
    .filter(c => {
      const iso = getRelevantDate(c)
      if (!iso) return false
      const diff = dayDiffFromTimeKey(toLocalTimeKey(iso))
      return diff >= -3 && diff <= 7
    })

  // 날짜+시간별 그룹핑
  const grouped = new Map<string, EnrichedCampaign[]>()
  for (const c of scheduled) {
    const iso = getRelevantDate(c)
    if (!iso) continue
    const key = toLocalTimeKey(iso)
    if (!key) continue
    const list = grouped.get(key) ?? []
    list.push(c)
    grouped.set(key, list)
  }

  // 시간 오름차순 정렬 (과거→현재→미래)
  const timeKeys = [...grouped.keys()].sort()

  const totalCount = scheduled.length

  return (
    <div className="rounded-[18px] border border-[#e0e0e0] bg-white">
      <div className="flex items-center gap-2 border-b border-[#F3F4F6] px-6 py-3.5">
        <Calendar className="h-4 w-4 text-[#0066cc]" />
        <ChartSectionNote sectionId="ops_scheduled_list" title="Scheduled 캠페인 현황" titleClassName="text-sm font-semibold text-[#1d1d1f]" />
        {!loading && (
          <span className="ml-1 rounded-full bg-[#e8f0fb] px-2 py-0.5 text-[11px] font-bold text-[#0066cc]">
            {totalCount}
          </span>
        )}
        <span className="ml-auto text-[11px] text-[#9CA3AF]">3일 전 ~ 7일 후 · 시간 순</span>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0066cc] border-t-transparent" />
          <span className="ml-2 text-xs text-[#6B7280]">Braze 연동 중...</span>
        </div>
      )}

      {error && !loading && (
        <div className="px-6 py-4 text-xs text-[#EF4444]">Braze 오류: {error}</div>
      )}

      {!loading && !error && timeKeys.length === 0 && (
        <div className="px-6 py-8 text-center text-xs text-[#9CA3AF]">
          최근 3일 ~ 7일 후 Scheduled 캠페인이 없습니다.
        </div>
      )}

      {!loading && !error && timeKeys.length > 0 && (
        <div className="overflow-x-auto">
          <div className="flex min-w-max gap-0 px-6 py-4">
            {timeKeys.map((timeKey, colIdx) => {
              const diff = dayDiffFromTimeKey(timeKey)
              const datePart = timeKey.split(' ')[0]
              const isToday = datePart === today
              const isFuture = diff > 0
              const items = grouped.get(timeKey) ?? []

              return (
                <div key={timeKey} className="flex">
                  <div className="flex flex-col items-center" style={{ minWidth: 140 }}>
                    {/* 헤더: 날짜 + 시간 + D-Day 뱃지 */}
                    <div className={`flex flex-col items-center gap-0.5 pb-3 ${isToday ? 'text-[#0066cc]' : isFuture ? 'text-[#1d1d1f]' : 'text-[#9CA3AF]'}`}>
                      <span className="text-xs font-semibold tabular-nums">{dateLabel(timeKey)}</span>
                      <span className="text-[11px] font-mono tabular-nums">{timeLabel(timeKey)}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        isToday ? 'bg-[#0066cc] text-white' :
                        isFuture ? 'bg-[#e8f0fb] text-[#0066cc]' :
                        'bg-[#F3F4F6] text-[#9CA3AF]'
                      }`}>
                        {dDayLabel(diff)}
                      </span>
                    </div>

                    {/* 타임라인 도트 */}
                    <div className="relative flex items-center w-full justify-center mb-3">
                      {colIdx > 0 && (
                        <div className="absolute right-1/2 top-1/2 -translate-y-1/2 h-0.5 bg-[#e0e0e0]" style={{ left: 0, right: '50%' }} />
                      )}
                      {colIdx < timeKeys.length - 1 && (
                        <div className="absolute top-1/2 -translate-y-1/2 h-0.5 bg-[#e0e0e0]" style={{ left: '50%', right: 0 }} />
                      )}
                      <div className={`relative z-10 h-3 w-3 rounded-full border-2 ${
                        isToday ? 'border-[#0066cc] bg-[#0066cc]' :
                        isFuture ? 'border-[#0066cc] bg-white' :
                        'border-[#D1D5DB] bg-white'
                      }`} />
                    </div>

                    {/* 캠페인 카드들 */}
                    <div className="flex flex-col gap-2 w-full px-2">
                      {items.map(c => {
                        const primaryChannel = c.channels[0] ?? ''
                        const badge = channelBadgeColor(primaryChannel)
                        return (
                          <div
                            key={c.id}
                            className={`rounded-lg border p-2.5 text-left group ${
                              isFuture || isToday
                                ? 'border-[#e8f0fb] bg-[#F8F9FF]'
                                : 'border-[#e0e0e0] bg-[#F9FAFB]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <div
                                className="rounded px-1.5 py-0.5 text-[10px] font-medium shrink-0"
                                style={{ backgroundColor: badge.bg, color: badge.text }}
                              >
                                {channelLabel(primaryChannel) || '기타'}
                              </div>
                              <span className={`rounded px-1 py-0.5 text-[9px] font-bold shrink-0 ${c.type === 'canvas' ? 'bg-[#EDE9FE] text-[#7C3AED]' : 'bg-[#e8f0fb] text-[#0066cc]'}`}>
                                {c.type === 'canvas' ? 'Canvas' : 'Cmpgn'}
                              </span>
                            </div>
                            <div className="flex items-start gap-1">
                              <p className="text-[11px] font-medium text-[#1d1d1f] leading-snug line-clamp-2 flex-1 min-w-0">
                                {c.name}
                              </p>
                              <a
                                href={c.type === 'canvas' ? brazeCanvasUrl(c.id, brazeBaseUrl) : brazeCampaignUrl(c.id, brazeBaseUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 text-[#9CA3AF] hover:text-[#0066cc] opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
