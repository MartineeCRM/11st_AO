import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { ChartSectionNote } from './charts/ChartSectionNote'
import type { EnrichedCampaign } from '@/hooks/useBrazeCampaigns'
import { channelLabel, channelBadgeColor, scheduleTypeLabel, brazeCampaignUrl } from '@/lib/braze'
import { cn } from '@/lib/utils'

const CHANNEL_TABS = ['전체', '푸시', '인앱', '이메일', 'SMS', '카카오', '웹훅'] as const
type ChannelTab = (typeof CHANNEL_TABS)[number]

const CHANNEL_FILTER_MAP: Record<ChannelTab, string[]> = {
  전체: [],
  푸시: ['push', 'android_push', 'ios_push', 'kindle_push'],
  인앱: ['in_app_message', 'trigger_in_app_message'],
  이메일: ['email'],
  SMS: ['sms'],
  카카오: ['kakao'],
  웹훅: ['webhook'],
}

interface Props {
  campaigns: EnrichedCampaign[]
  loading: boolean
  error: string | null
}

export function LiveCampaignTable({ campaigns, loading, error }: Props) {
  const [activeChannel, setActiveChannel] = useState<ChannelTab>('전체')

  const filtered =
    activeChannel === '전체'
      ? campaigns
      : campaigns.filter(c => {
          const allowed = CHANNEL_FILTER_MAP[activeChannel]
          return c.channels.some(ch => allowed.includes(ch.toLowerCase()))
        })

  const primaryChannel = (c: EnrichedCampaign) =>
    c.channels[0] ?? 'unknown'

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white">
      {/* 카드 헤더 */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#F3F4F6]">
        <div className="flex items-center gap-2.5">
          <ChartSectionNote sectionId="ops_live_table" title="라이브 캠페인 현황" titleClassName="text-sm font-semibold text-[#111827]" />
          <span className="flex items-center gap-1 rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-[11px] font-bold text-[#16A34A]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
            LIVE
          </span>
          {!loading && (
            <span className="text-xs text-[#9CA3AF]">{filtered.length}개</span>
          )}
        </div>
      </div>

      {/* 채널 탭 */}
      <div className="flex border-b border-[#F3F4F6] bg-[#F9FAFB]">
        {CHANNEL_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveChannel(tab)}
            className={cn(
              'px-4 py-2.5 text-[13px] font-medium transition-colors',
              activeChannel === tab
                ? 'bg-white text-[#4361EE] border-b-2 border-[#4361EE]'
                : 'text-[#6B7280] hover:text-[#374151]',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 로딩 / 에러 */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-sm text-[#9CA3AF]">
          <span className="animate-spin mr-2">⟳</span> Braze에서 캠페인 불러오는 중...
        </div>
      )}
      {error && (
        <div className="px-6 py-8 text-sm text-[#EF4444]">
          오류: {error}
        </div>
      )}

      {/* 테이블 */}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <div className="max-h-[520px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#F9FAFB] text-[#6B7280] text-xs font-semibold">
                <th className="px-4 py-3 text-left w-64">캠페인명</th>
                <th className="px-3 py-3 text-left w-20">채널</th>
                <th className="px-3 py-3 text-left w-28">발송 유형</th>
                <th className="px-3 py-3 text-left w-24">상태</th>
                <th className="px-3 py-3 text-left w-32">생성일</th>
                <th className="px-3 py-3 text-left w-32">수정일</th>
                <th className="px-3 py-3 text-center w-16">상세</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#9CA3AF] text-sm">
                    해당 채널의 라이브 캠페인이 없습니다.
                  </td>
                </tr>
              )}
              {filtered.map(c => {
                const ch = primaryChannel(c)
                const badge = channelBadgeColor(ch)
                return (
                  <tr key={c.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-4 py-3 font-medium text-[#111827] max-w-[256px] truncate">
                      {c.name}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className="inline-block rounded px-2 py-0.5 text-[11px] font-semibold"
                        style={{ background: badge.bg, color: badge.text }}
                      >
                        {channelLabel(ch)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[#374151] text-xs">
                      {scheduleTypeLabel(c.schedule_type)}
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-semibold text-[#16A34A]">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
                        라이브
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-[#6B7280]">
                      {c.created_at ? c.created_at.slice(0, 10) : '—'}
                    </td>
                    <td className="px-3 py-3 text-xs text-[#6B7280]">
                      {c.updated_at ? c.updated_at.slice(0, 10) : '—'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <a
                        href={brazeCampaignUrl(c.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center text-[#9CA3AF] hover:text-[#4361EE] transition-colors"
                        title="Braze에서 열기"
                      >
                        <ExternalLink size={15} />
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
