import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { formatNumber, formatCurrency } from '@/lib/formatters'
import { buildAoCampaignDailyRows } from '@/lib/metrics'
import type { MartineeUnionRow } from '@/types/sheets'

interface Props {
  rows: MartineeUnionRow[]
  campaign: string
}

const PAGE_SIZE = 14

export function AoCampaignDailyTable({ rows, campaign }: Props) {
  const [expanded, setExpanded] = useState(false)
  const daily = useMemo(() => (campaign ? buildAoCampaignDailyRows(rows, campaign) : []), [rows, campaign])
  const visible = expanded ? daily : daily.slice(0, PAGE_SIZE)
  const hiddenCount = daily.length - PAGE_SIZE

  return (
    <div className="rounded-xl border border-[#e0e0e0] bg-white">
      <div className="border-b border-[#e0e0e0] px-4 py-3">
        <p className="truncate text-sm font-semibold text-[#1d1d1f]">{campaign || '캠페인을 선택하세요'}</p>
        <p className="mt-0.5 text-[10px] text-[#9CA3AF]">일자별 실적 · 최신 날짜순</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="border-b border-[#F3F4F6] bg-[#F9FAFB]">
              <th className="px-4 py-2 text-left text-[11px] font-semibold text-[#6B7280]">일자</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">노출</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">발송</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">Conv A</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">Conv B</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-xs text-[#9CA3AF]">이 기간 데이터 없음</td>
              </tr>
            ) : (
              visible.map((row, idx) => (
                <tr key={row.date} className={cn('border-b border-[#F3F4F6] hover:bg-[#F9FAFB]', idx % 2 === 1 && 'bg-[#FAFAFB]')}>
                  <td className="px-4 py-2 text-xs font-medium text-[#1d1d1f]">{row.date}</td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">{formatNumber(row.impressions)}</td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">{formatNumber(row.sent)}</td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">{formatNumber(row.conversionA)}</td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">{formatNumber(row.conversionB)}</td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">{formatCurrency(row.revenue)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {hiddenCount > 0 && (
        <div className="border-t border-[#F3F4F6] px-4 py-2.5 text-center">
          <button onClick={() => setExpanded(v => !v)} className="text-xs font-medium text-[#0066cc] hover:underline">
            {expanded ? '접기' : `나머지 ${hiddenCount}일 더 보기`}
          </button>
        </div>
      )}
    </div>
  )
}
