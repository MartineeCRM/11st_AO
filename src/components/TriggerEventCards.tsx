import { ExternalLink } from 'lucide-react'
import type { EnrichedCampaign } from '@/hooks/useBrazeCampaigns'
import { channelLabel, channelBadgeColor, brazeCampaignUrl } from '@/lib/braze'

interface Props {
  campaigns: EnrichedCampaign[]
  loading: boolean
  error: string | null
}

interface TriggerGroup {
  triggerAction: string
  campaigns: EnrichedCampaign[]
}

function groupByTrigger(campaigns: EnrichedCampaign[]): TriggerGroup[] {
  const actionBased = campaigns.filter(c => c.schedule_type === 'action_based')
  const map = new Map<string, EnrichedCampaign[]>()
  for (const c of actionBased) {
    const key = c.trigger_action ?? '(알 수 없는 트리거)'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(c)
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .map(([triggerAction, campaigns]) => ({ triggerAction, campaigns }))
}

const TRIGGER_COLORS = [
  '#4361EE', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#06B6D4', '#F97316', '#EC4899',
]

export function TriggerEventCards({ campaigns, loading, error }: Props) {
  const groups = groupByTrigger(campaigns)

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white">
      <div className="flex items-center gap-2.5 px-6 py-3.5 border-b border-[#F3F4F6]">
        <span className="text-sm font-semibold text-[#111827]">Action-Based 트리거 이벤트 현황</span>
        {!loading && (
          <span className="text-xs text-[#9CA3AF]">{groups.length}개 트리거</span>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-sm text-[#9CA3AF]">
          <span className="animate-spin mr-2">⟳</span> 트리거 이벤트 분석 중...
        </div>
      )}
      {error && (
        <div className="px-6 py-8 text-sm text-[#EF4444]">오류: {error}</div>
      )}
      {!loading && !error && groups.length === 0 && (
        <div className="py-12 text-center text-[#9CA3AF] text-sm">
          Action-Based 캠페인이 없습니다.
        </div>
      )}

      {!loading && !error && groups.length > 0 && (
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group, idx) => {
            const color = TRIGGER_COLORS[idx % TRIGGER_COLORS.length]
            return (
              <div
                key={group.triggerAction}
                className="rounded-lg border border-[#E5E7EB] overflow-hidden"
                style={{ borderLeftColor: color, borderLeftWidth: 3 }}
              >
                {/* 그룹 헤더 */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#F9FAFB] border-b border-[#F3F4F6]">
                  <span className="text-[13px] font-semibold text-[#111827] truncate pr-2">
                    {group.triggerAction}
                  </span>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold"
                    style={{ background: `${color}18`, color }}
                  >
                    {group.campaigns.length}개
                  </span>
                </div>

                {/* 캠페인 목록 */}
                <div className="divide-y divide-[#F9FAFB] max-h-64 overflow-y-auto">
                  {group.campaigns.map(c => {
                    const ch = c.channels[0] ?? 'unknown'
                    const badge = channelBadgeColor(ch)
                    return (
                      <div key={c.id} className="flex items-center gap-2 px-4 py-2.5 hover:bg-[#FAFAFA]">
                        <span
                          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{ background: badge.bg, color: badge.text }}
                        >
                          {channelLabel(ch)}
                        </span>
                        <span className="flex-1 text-xs text-[#374151] truncate">{c.name}</span>
                        <a
                          href={brazeCampaignUrl(c.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-[#9CA3AF] hover:text-[#4361EE] transition-colors"
                          title="Braze에서 열기"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
