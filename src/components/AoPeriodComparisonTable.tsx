import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { AoSortSelect } from './filters/AoSortSelect'
import { DateField } from './filters/DateField'
import { formatNumber, formatCountWithRate, formatCurrency } from '@/lib/formatters'
import { buildAoPeriodTable, calcPeriodDelta, sortByAoMetric, type AoPeriodRow, type AoSortKey } from '@/lib/metrics'
import type { MartineeUnionRow, DateRange } from '@/types/sheets'

interface Props {
  /** AO 캠페인으로 이미 필터링된 행 (전체 기간 — 두 비교 기간을 자유롭게 고를 수 있어야 하므로 날짜 필터는 걸지 않음) */
  rows: MartineeUnionRow[]
  periodA: DateRange
  periodB: DateRange
  onPeriodAChange: (range: DateRange) => void
  onPeriodBChange: (range: DateRange) => void
}

const PAGE_SIZE = 10

function Leaderboard({ title, data, expanded, showExtra }: { title: string; data: AoPeriodRow[]; expanded: boolean; showExtra: boolean }) {
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
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">Conv B</th>
              {showExtra && (
                <>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">Conv C</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">Conv D</th>
                </>
              )}
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={showExtra ? 7 : 5} className="px-3 py-6 text-center text-xs text-[#9CA3AF]">이 기간 데이터 없음</td>
              </tr>
            ) : (
              visible.map((row, idx) => (
                <tr key={row.campaign} className={cn('border-b border-[#F3F4F6] hover:bg-[#F9FAFB]', idx % 2 === 1 && 'bg-[#FAFAFB]')}>
                  <td className="max-w-[220px] whitespace-normal break-words px-3 py-2 text-xs font-medium text-[#1d1d1f]">{row.campaign}</td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">{formatNumber(row.impressions + row.sent)}</td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">{formatCountWithRate(row.conversionA, row.conversionRateA)}</td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">{formatCountWithRate(row.conversionB, row.conversionRateB)}</td>
                  {showExtra && (
                    <>
                      <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">{formatCountWithRate(row.conversionC, row.conversionRateC)}</td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">{formatCountWithRate(row.conversionD, row.conversionRateD)}</td>
                    </>
                  )}
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

export function AoPeriodComparisonTable({ rows, periodA, periodB, onPeriodAChange, onPeriodBChange }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [showExtra, setShowExtra] = useState(false)
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e0e0e0] px-4 py-3">
        <div>
          <p className="text-xs font-semibold text-[#1d1d1f]">기간 비교</p>
          <p className="text-[10px] text-[#9CA3AF] mt-0.5">두 기간을 골라 캠페인 성과를 나란히 비교</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#6B7280]">비교 기간</span>
            <DateField value={periodA.start} onChange={v => onPeriodAChange({ ...periodA, start: v })} />
            <span className="text-[#9CA3AF]">~</span>
            <DateField value={periodA.end} onChange={v => onPeriodAChange({ ...periodA, end: v })} />
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-[#1d1d1f]">기준 기간</span>
            <DateField value={periodB.start} onChange={v => onPeriodBChange({ ...periodB, start: v })} />
            <span className="text-[#9CA3AF]">~</span>
            <DateField value={periodB.end} onChange={v => onPeriodBChange({ ...periodB, end: v })} />
          </div>
          <AoSortSelect value={sortKey} onChange={setSortKey} />

          <button
            onClick={() => setShowExtra(v => !v)}
            className={cn(
              'rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
              showExtra
                ? 'border-[#0066cc] bg-[#e8f0fb] text-[#0066cc]'
                : 'border-[#e0e0e0] bg-[#F9FAFB] text-[#6B7280] hover:text-[#1d1d1f]',
            )}
          >
            Conversion C/D {showExtra ? '숨기기' : '표시'}
          </button>
        </div>
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
        <Leaderboard title="비교 기간" data={sortedA} expanded={expanded} showExtra={showExtra} />
        <Leaderboard title="기준 기간" data={sortedB} expanded={expanded} showExtra={showExtra} />
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
