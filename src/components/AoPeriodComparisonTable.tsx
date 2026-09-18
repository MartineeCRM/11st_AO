import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { ChartSectionNote } from './charts/ChartSectionNote'
import { formatNumber, formatRate, formatCurrency } from '@/lib/formatters'
import { buildAoPeriodTable, shiftYears, calcYoY, type AoPeriodRow } from '@/lib/metrics'
import type { MartineeUnionRow } from '@/types/sheets'

interface Props {
  /** AO 캠페인으로 이미 필터링된 행 (전체 기간 — 전년 동기간 계산을 위해 날짜 범위 필터는 걸지 않음) */
  rows: MartineeUnionRow[]
  /** 상단 기간 선택 필터에서 고른 "이번 기간" */
  start: string
  end: string
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

export function AoPeriodComparisonTable({ rows, start, end }: Props) {
  const [expanded, setExpanded] = useState(false)

  const priorStart = shiftYears(start, -1)
  const priorEnd = shiftYears(end, -1)

  const currentTable = useMemo(() => buildAoPeriodTable(rows, start, end), [rows, start, end])
  const priorTable = useMemo(() => buildAoPeriodTable(rows, priorStart, priorEnd), [rows, priorStart, priorEnd])

  const currentRevenue = currentTable.reduce((s, r) => s + r.revenue, 0)
  const priorRevenue = priorTable.reduce((s, r) => s + r.revenue, 0)
  const totalYoY = calcYoY(currentRevenue, priorRevenue)

  const maxRows = Math.max(currentTable.length, priorTable.length)
  const hiddenCount = maxRows - PAGE_SIZE

  return (
    <div className="rounded-xl border border-[#e0e0e0] bg-white">
      <div className="border-b border-[#e0e0e0] px-4 py-3">
        <ChartSectionNote sectionId="ao_period_comparison" title="기간 비교 (YoY)" titleClassName="text-xs font-semibold text-[#1d1d1f]" />
        <p className="text-[10px] text-[#9CA3AF] mt-0.5">위 기간 선택과 동일한 구간을 작년 같은 기간과 나란히 비교</p>
      </div>

      <div className="px-4 pt-3">
        <table className="min-w-[360px] text-xs">
          <thead>
            <tr className="text-[#9CA3AF]">
              <th className="pb-1.5 pr-6 text-left font-medium">기간</th>
              <th className="pb-1.5 pr-6 text-left font-medium">시작일</th>
              <th className="pb-1.5 text-left font-medium">종료일</th>
            </tr>
          </thead>
          <tbody className="text-[#1d1d1f]">
            <tr>
              <td className="py-0.5 pr-6 text-[#6B7280]">전년 동기간</td>
              <td className="py-0.5 pr-6 tabular-nums">{priorStart}</td>
              <td className="py-0.5 tabular-nums">{priorEnd}</td>
            </tr>
            <tr>
              <td className="py-0.5 pr-6 font-semibold">이번 기간</td>
              <td className="py-0.5 pr-6 tabular-nums font-semibold">{start}</td>
              <td className="py-0.5 tabular-nums font-semibold">{end}</td>
            </tr>
          </tbody>
        </table>

        {totalYoY !== null && (
          <p className="mt-2 text-xs text-[#6B7280]">
            전체 Revenue YoY{' '}
            <span className={cn('font-semibold', totalYoY >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]')}>
              {totalYoY >= 0 ? '▲' : '▼'} {Math.abs(totalYoY * 100).toFixed(1)}%
            </span>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4 p-4 md:flex-row">
        <Leaderboard title="전년 동기간" data={priorTable} expanded={expanded} />
        <Leaderboard title="이번 기간" data={currentTable} expanded={expanded} />
      </div>

      {hiddenCount > 0 && (
        <div className="border-t border-[#F3F4F6] px-4 py-2.5 text-center">
          <button onClick={() => setExpanded(v => !v)} className="text-xs font-medium text-[#0066cc] hover:underline">
            {expanded ? '접기' : `나머지 캠페인 더 보기`}
          </button>
        </div>
      )}
    </div>
  )
}
