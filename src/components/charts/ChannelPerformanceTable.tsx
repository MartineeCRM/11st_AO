import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { ChartSectionNote } from './ChartSectionNote'
import { formatKorean, formatRate } from '@/lib/formatters'
import { calcSentImpression, calcCTR, calcCVR } from '@/lib/metrics'
import type { MartineeUnionRow } from '@/types/sheets'

interface ChannelRow {
  channel: string
  sentImpression: number
  ctr: number
  cvr: number
  revenue: number
  revenuePerSend: number
}

function buildChannelRows(rows: MartineeUnionRow[]): ChannelRow[] {
  const byChannel = new Map<string, MartineeUnionRow[]>()
  for (const r of rows) {
    const key = r.channel || '(미지정)'
    const list = byChannel.get(key) ?? []
    list.push(r)
    byChannel.set(key, list)
  }
  return [...byChannel.entries()]
    .map(([channel, rs]) => {
      const si = calcSentImpression(rs)
      const rev = rs.reduce((s, r) => s + r.revenue, 0)
      return {
        channel,
        sentImpression: si,
        ctr: calcCTR(rs),
        cvr: calcCVR(rs),
        revenue: rev,
        revenuePerSend: si > 0 ? rev / si : 0,
      }
    })
    .sort((a, b) => b.sentImpression - a.sentImpression)
}

interface Props {
  rows: MartineeUnionRow[]
}

const PAGE_SIZE = 10

export function ChannelPerformanceTable({ rows }: Props) {
  const channelRows = useMemo(() => buildChannelRows(rows), [rows])
  const [expanded, setExpanded] = useState(false)

  if (channelRows.length === 0) return null

  const maxSI = Math.max(...channelRows.map(r => r.sentImpression), 1)
  const visibleRows = expanded ? channelRows : channelRows.slice(0, PAGE_SIZE)
  const hiddenCount = channelRows.length - PAGE_SIZE

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white">
      <div className="border-b border-[#E5E7EB] px-4 py-3">
        <ChartSectionNote sectionId="perf_channel_table" title="채널별 성과 비교" titleClassName="text-xs font-semibold text-[#374151]" />
        <p className="text-[10px] text-[#9CA3AF] mt-0.5">Channel 기준 그루핑</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[580px]">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <th className="px-4 py-2 text-left text-[11px] font-semibold text-[#6B7280]">Channel</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">발송/노출</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">CTR</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">CVR</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">Revenue</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">발송당 Revenue</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(row => (
              <tr key={row.channel} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                <td className="px-4 py-2 text-xs font-medium text-[#374151]">{row.channel}</td>
                <td className="px-3 py-2 text-right text-xs tabular-nums text-[#374151]">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1.5 w-16 rounded-full bg-[#E5E7EB] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#4361EE]"
                        style={{ width: `${(row.sentImpression / maxSI) * 100}%` }}
                      />
                    </div>
                    {formatKorean(row.sentImpression)}
                  </div>
                </td>
                <td className={cn(
                  'px-3 py-2 text-right text-xs tabular-nums font-medium',
                  row.ctr > 0.1 ? 'text-[#10B981]' : row.ctr > 0.05 ? 'text-[#374151]' : 'text-[#EF4444]',
                )}>
                  {formatRate(row.ctr)}
                </td>
                <td className={cn(
                  'px-3 py-2 text-right text-xs tabular-nums font-medium',
                  row.cvr > 0.05 ? 'text-[#10B981]' : row.cvr > 0.01 ? 'text-[#374151]' : 'text-[#EF4444]',
                )}>
                  {formatRate(row.cvr)}
                </td>
                <td className="px-3 py-2 text-right text-xs tabular-nums text-[#374151]">
                  ₩{formatKorean(Math.round(row.revenue))}
                </td>
                <td className="px-3 py-2 text-right text-xs tabular-nums text-[#374151]">
                  ₩{row.revenuePerSend.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hiddenCount > 0 && (
        <div className="border-t border-[#F3F4F6] px-4 py-2.5 text-center">
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs font-medium text-[#4361EE] hover:underline"
          >
            {expanded ? '접기' : `나머지 ${hiddenCount}개 더 보기`}
          </button>
        </div>
      )}
    </div>
  )
}
