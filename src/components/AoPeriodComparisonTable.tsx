import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { ChartSectionNote } from './charts/ChartSectionNote'
import { AoSortSelect } from './filters/AoSortSelect'
import { formatNumber, formatRate, formatCurrency } from '@/lib/formatters'
import { buildAoPeriodTable, calcPeriodDelta, sortByAoMetric, type AoPeriodRow, type AoSortKey } from '@/lib/metrics'
import type { MartineeUnionRow, DateRange } from '@/types/sheets'

interface Props {
  /** AO 캠페인으로 이미 필터링된 행 (전체 기간 — 두 비교 기간을 자유롭게 고를 수 있어야 하므로 날짜 필터는 걸지 않음) */
  rows: MartineeUnionRow[]
  periodA: DateRange
  periodB: DateRange
}

const PAGE_SIZE = 10

function Leaderboard({ title, data, expanded }: { title: string; data: AoPeriodRow[]; expanded: boolean }) {
  const visible = expanded ? data : data.slice(0, PAGE_SIZE)

  return (
    <div className="flex-1 min-w-0">
      <p className="mb-2 px-1 text-xs font-semibold text-[#1d1d1f]">{title}</p>
      <div className="overflow-x-auto rounded-lg border border-[#e0e0e0]">
        <table className="w-full min-w-[480px]">
          <thead>
            <tr className="border-b border-[#F3F4F6] bg-[#F9FAFB]">
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-[#6B7280]">캠페인명</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">발송/노출</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">Conv A</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">전환율</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-xs text-[#9CA3AF]">이 기간 데이터 없음</td>
              </tr>
            ) : (
              visible.map((row, idx) => (
                <tr key={row.campaign} className={cn('border-b border-[#F3F4F6] hover:bg-[#F9FAFB]', idx % 2 === 1 && 'bg-[#FAFAFB]')}>
                  <td className="max-w-[180px] truncate px-3 py-2 text-xs font-medium text-[#1d1d1f]">{row.campaign}</td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">{formatNumber(row.impressions + row.sent)}</td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">{formatNumber(row.conversionA)}</td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">{formatRate(row.conversionRate)}</td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">{formatCurrency(row.revenue)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AoPeriodComparisonTable({ rows, periodA, periodB }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [sortKey, setSortKey] = useState<AoSortKey>('revenue')

  const tableA = useMemo(() => buildAoPeriodTable(rows, periodA.start, periodA.end), [rows, periodA])
  const tableB = useMemo(() => buildAoPeriodTable(rows, periodB.start, periodB.end), [rows, periodB])

  const sortedA = useMemo(() => sortByAoMetric(tableA, sortKey, r => r), [tableA, sortKey])
  const sortedB = useMemo(() => sortByAoMetric(tableB, sortKey, r => r), [tableB, sortKey])

  const revenueA = tableA.reduce((s, r) => s + r.revenue, 0)
  const revenueB = tableB.reduce((s, r) => s + r.revenue, 0)
  const delta = calcPeriodDelta(revenueB, revenueA)

  const maxRows = Math.max(tableA.length, tableB.length)
  const hiddenCount = maxRows - PAGE_SIZE

  return (
    <div className="rounded-xl border border-[#e0e0e0] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e0e0e0] px-4 py-3">
        <div>
          <ChartSectionNote sectionId="ao_period_comparison" title="기간 비교" titleClassName="text-xs font-semibold text-[#1d1d1f]" />
          <p className="text-[10px] text-[#9CA3AF] mt-0.5">위에서 고른 두 기간의 캠페인 성과를 나란히 비교</p>
        </div>
        <AoSortSelect value={sortKey} onChange={setSortKey} />
      </div>

      {delta !== null && (
        <p className="px-4 pt-3 text-xs text-[#6B7280]">
          전체 Revenue 증감{' '}
          <span className={cn('font-semibold', delta >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]')}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta * 100).toFixed(1)}%
          </span>
          <span className="text-[#9CA3AF]"> (비교 기간 대비 기준 기간)</span>
        </p>
      )}

      <div className="flex flex-col gap-4 p-4 md:flex-row">
        <Leaderboard title="비교 기간" data={sortedA} expanded={expanded} />
        <Leaderboard title="기준 기간" data={sortedB} expanded={expanded} />
      </div>

      {hiddenCount > 0 && (
        <div className="border-t border-[#F3F4F6] px-4 py-2.5 text-center">
          <button onClick={() => setExpanded(v => !v)} className="text-xs font-medium text-[#0066cc] hover:underline">
            {expanded ? '접기' : '나머지 캠페인 더 보기'}
          </button>
        </div>
      )}
    </div>
  )
}
