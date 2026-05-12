import { Calendar, ExternalLink } from 'lucide-react'
import { ChartSectionNote } from './charts/ChartSectionNote'
import { channelLabel, channelBadgeColor, brazeCampaignUrl } from '@/lib/braze'
import type { EnrichedCampaign } from '@/hooks/useBrazeCampaigns'

function getRelevantDate(c: EnrichedCampaign): string | undefined {
  return c.first_sent || c.last_sent || c.updated_at
}

function toLocalDateKey(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayKey(): string {
  return toLocalDateKey(new Date().toISOString())
}

function dateLabel(key: string): string {
  const [, m, d] = key.split('-')
  return `${Number(m)}/${Number(d)}`
}

function dayDiffFromKey(dateKey: string): number {
  const today = todayKey()
  const a = new Date(today).getTime()
  const b = new Date(dateKey).getTime()
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
}

export function ScheduledCampaignList({ campaigns, loading, error }: Props) {
  const today = todayKey()

  // scheduled 캠페인만 추출하고 7일 이내로 필터
  const scheduled = campaigns
    .filter(c => c.schedule_type === 'time_based' || c.schedule_type === 'scheduled')
    .filter(c => {
      const iso = getRelevantDate(c)
      if (!iso) return false
      const diff = dayDiffFromKey(toLocalDateKey(iso))
      return diff >= -7  // 7일 전까지만 표시
    })

  // 날짜별 그룹핑
  const grouped = new Map<string, EnrichedCampaign[]>()
  for (const c of scheduled) {
    const iso = getRelevantDate(c)
    if (!iso) continue
    const key = toLocalDateKey(iso)
    if (!key) continue
    const list = grouped.get(key) ?? []
    list.push(c)
    grouped.set(key, list)
  }

  // 날짜 키 정렬 (오름차순 — 과거→미래)
  const dateKeys = [...grouped.keys()].sort()

  const totalCount = scheduled.length

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white">
      <div className="flex items-center gap-2 border-b border-[#F3F4F6] px-6 py-3.5">
        <Calendar className="h-4 w-4 text-[#4361EE]" />
        <ChartSectionNote sectionId="ops_scheduled_list" title="Scheduled 캠페인 현황" titleClassName="text-sm font-semibold text-[#111827]" />
        {!loading && (
          <span className="ml-1 rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-bold text-[#4361EE]">
            {totalCount}
          </span>
        )}
        <span className="ml-auto text-[11px] text-[#9CA3AF]">7일 이내 · 날짜 순</span>
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

      {!loading && !error && dateKeys.length === 0 && (
        <div className="px-6 py-8 text-center text-xs text-[#9CA3AF]">
          최근 7일 이내 Scheduled 캠페인이 없습니다.
        </div>
      )}

      {!loading && !error && dateKeys.length > 0 && (
        <div className="overflow-x-auto">
          <div className="flex min-w-max gap-0 px-6 py-4">
            {dateKeys.map((dateKey, colIdx) => {
              const diff = dayDiffFromKey(dateKey)
              const isToday = dateKey === today
              const isFuture = diff > 0
              const items = grouped.get(dateKey) ?? []

              return (
                <div key={dateKey} className="flex">
                  {/* 날짜 컬럼 */}
                  <div className="flex flex-col items-center" style={{ minWidth: 140 }}>
                    {/* X축 날짜 헤더 */}
                    <div className={`flex flex-col items-center gap-0.5 pb-3 ${isToday ? 'text-[#4361EE]' : isFuture ? 'text-[#374151]' : 'text-[#9CA3AF]'}`}>
                      <span className="text-xs font-semibold tabular-nums">{dateLabel(dateKey)}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        isToday ? 'bg-[#4361EE] text-white' :
                        isFuture ? 'bg-[#EEF2FF] text-[#4361EE]' :
                        'bg-[#F3F4F6] text-[#9CA3AF]'
                      }`}>
                        {dDayLabel(diff)}
                      </span>
                    </div>

                    {/* 가로 연결선 위 도트 */}
                    <div className="relative flex items-center w-full justify-center mb-3">
                      {/* 왼쪽 연결선 */}
                      {colIdx > 0 && (
                        <div className="absolute right-1/2 top-1/2 -translate-y-1/2 h-0.5 bg-[#E5E7EB]" style={{ left: 0, right: '50%' }} />
                      )}
                      {/* 오른쪽 연결선 */}
                      {colIdx < dateKeys.length - 1 && (
                        <div className="absolute top-1/2 -translate-y-1/2 h-0.5 bg-[#E5E7EB]" style={{ left: '50%', right: 0 }} />
                      )}
                      {/* 도트 */}
                      <div className={`relative z-10 h-3 w-3 rounded-full border-2 ${
                        isToday ? 'border-[#4361EE] bg-[#4361EE]' :
                        isFuture ? 'border-[#4361EE] bg-white' :
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
                                ? 'border-[#E0E7FF] bg-[#F8F9FF]'
                                : 'border-[#E5E7EB] bg-[#F9FAFB]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <div
                                className="rounded px-1.5 py-0.5 text-[10px] font-medium shrink-0"
                                style={{ backgroundColor: badge.bg, color: badge.text }}
                              >
                                {channelLabel(primaryChannel) || '기타'}
                              </div>
                            </div>
                            <div className="flex items-start gap-1">
                              <p className="text-[11px] font-medium text-[#111827] leading-snug line-clamp-2 flex-1 min-w-0">
                                {c.name}
                              </p>
                              <a
                                href={brazeCampaignUrl(c.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 text-[#9CA3AF] hover:text-[#4361EE] opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* 컬럼 간 수직 구분선 제거 — 연결선으로 대체 */}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
