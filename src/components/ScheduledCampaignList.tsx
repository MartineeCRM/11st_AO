import { Calendar, ExternalLink } from 'lucide-react'
import { channelLabel, channelBadgeColor, brazeCampaignUrl } from '@/lib/braze'
import type { EnrichedCampaign } from '@/hooks/useBrazeCampaigns'

function formatDate(iso: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

interface Props {
  campaigns: EnrichedCampaign[]
  loading: boolean
  error: string | null
}

export function ScheduledCampaignList({ campaigns, loading, error }: Props) {
  const scheduled = campaigns
    .filter(c => c.schedule_type === 'time_based' || c.schedule_type === 'scheduled')
    .sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))
    .slice(0, 20)

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
        <span className="ml-auto text-[11px] text-[#9CA3AF]">최근 수정 순 · 최대 20개</span>
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
        <div className="divide-y divide-[#F3F4F6]">
          {scheduled.map(c => {
            const primaryChannel = c.channels[0] ?? ''
            const badge = channelBadgeColor(primaryChannel)
            return (
              <div key={c.id} className="flex items-center gap-3 px-6 py-3 hover:bg-[#F9FAFB]">
                <div
                  className="shrink-0 rounded px-2 py-0.5 text-[11px] font-medium"
                  style={{ backgroundColor: badge.bg, color: badge.text }}
                >
                  {channelLabel(primaryChannel) || '기타'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-medium text-[#111827]">{c.name}</p>
                </div>
                <span className="shrink-0 text-[11px] text-[#9CA3AF] tabular-nums">
                  수정: {formatDate(c.updated_at)}
                </span>
                <a
                  href={brazeCampaignUrl(c.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[#9CA3AF] hover:text-[#4361EE]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
