import { useMemo, useState } from 'react'
import { ArrowDownUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber, formatRate, formatCurrency } from '@/lib/formatters'
import { sumRows, calcPurchaseMetrics } from '@/lib/attributionMetrics'
import type { AttDataRow } from '@/types/sheets'

type SortKey = 'revenue' | 'user_cvr' | 'purchase_count' | 'aov'

interface CampaignRow {
  alias: string
  revenue: number
  user_cvr: number
  purchase_count: number
  aov: number
  impression: number
}

function buildCampaignRows(rows: AttDataRow[]): CampaignRow[] {
  const byAlias = new Map<string, AttDataRow[]>()
  for (const r of rows) {
    const key = r.source_alias || '(미지정)'
    const list = byAlias.get(key) ?? []
    list.push(r)
    byAlias.set(key, list)
  }
  return [...byAlias.entries()].map(([alias, rs]) => {
    const sums = sumRows(rs)
    const m = calcPurchaseMetrics(sums)
    return {
      alias,
      revenue: m.revenue,
      user_cvr: m.user_cvr,
      purchase_count: m.purchase_count,
      aov: m.aov,
      impression: sums.impression_or_send_user,
    }
  })
}

interface Props {
  rows: AttDataRow[]
}

export function CampaignRoiTable({ rows }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('revenue')

  const campaignRows = useMemo(() => {
    const data = buildCampaignRows(rows)
    return [...data].sort((a, b) => b[sortKey] - a[sortKey])
  }, [rows, sortKey])

  if (campaignRows.length === 0) {
    return null
  }

  const cols: { key: SortKey; label: string; fmt: (r: CampaignRow) => string }[] = [
    { key: 'revenue', label: '기여 매출', fmt: r => `₩${formatNumber(Math.round(r.revenue))}` },
    { key: 'user_cvr', label: '구매 CVR', fmt: r => formatRate(r.user_cvr) },
    { key: 'purchase_count', label: '구매 건수', fmt: r => formatNumber(r.purchase_count) },
    { key: 'aov', label: 'AOV', fmt: r => formatCurrency(r.aov) },
  ]

  const totalRevenue = campaignRows.reduce((s, r) => s + r.revenue, 0)

  return (
    <div className="mt-4 rounded-xl border border-[#E5E7EB] bg-white">
      <div className="flex items-center gap-2 border-b border-[#E5E7EB] px-4 py-3">
        <p className="text-xs font-semibold text-[#374151]">캠페인별 Attribution ROI</p>
        <span className="text-[11px] text-[#9CA3AF]">— 6h Attribution 기준</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <th className="px-4 py-2 text-left text-[11px] font-semibold text-[#6B7280]">캠페인</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">도달 유저</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">매출 비중</th>
              {cols.map(col => (
                <th key={col.key} className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">
                  <button
                    className={cn('flex items-center gap-1 ml-auto', sortKey === col.key && 'text-[#4361EE]')}
                    onClick={() => setSortKey(col.key)}
                  >
                    {col.label}
                    <ArrowDownUp className="h-3 w-3" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaignRows.map((row, i) => {
              const revenueShare = totalRevenue > 0 ? row.revenue / totalRevenue : 0
              return (
                <tr key={row.alias} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                  <td className="px-4 py-2 text-xs text-[#374151]">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#9CA3AF] tabular-nums w-4">{i + 1}</span>
                      <span className="font-medium">{row.alias}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums text-[#6B7280]">
                    {formatNumber(row.impression)}
                  </td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="h-1.5 w-16 rounded-full bg-[#E5E7EB] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#4361EE]"
                          style={{ width: `${revenueShare * 100}%` }}
                        />
                      </div>
                      <span className="text-[#6B7280] w-8">{formatRate(revenueShare)}</span>
                    </div>
                  </td>
                  {cols.map(col => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-3 py-2 text-right text-xs tabular-nums',
                        sortKey === col.key ? 'font-semibold text-[#111827]' : 'text-[#374151]',
                      )}
                    >
                      {col.fmt(row)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
