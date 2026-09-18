import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { ChartSectionNote } from './charts/ChartSectionNote'
import { formatNumber, formatRate, formatCurrency } from '@/lib/formatters'
import { buildAoPeriodTable, previousPeriodOfSameLength, calcPeriodDelta, type AoPeriodRow } from '@/lib/metrics'
import type { MartineeUnionRow } from '@/types/sheets'

interface Props {
  /** AO 캠페인으로 이미 필터링된 행 (전체 기간 — 두 비교 기간을 자유롭게 고를 수 있어야 하므로 날짜 필터는 걸지 않음) */
  rows: MartineeUnionRow[]
  /** 처음 진입 시 "기준 기간" 기본값 (상단 기간 선택 필터 값) */
  defaultStart: string
  defaultEnd: string
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

function DateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="date"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="rounded-md border border-[#e0e0e0] bg-white px-2 py-1 text-xs text-[#1d1d1f] tabular-nums focus:border-[#0066cc] focus:outline-none"
    />
  )
}

export function AoPeriodComparisonTable({ rows, defaultStart, defaultEnd }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [periodB, setPeriodB] = useState({ start: '', end: '' }) // 기준 기간 (예: 당월)
  const [periodA, setPeriodA] = useState({ start: '', end: '' }) // 비교 기간 (예: 전월)
  const initialized = useRef(false)

  // 상단 기간 필터 값이 처음 들어오면 "기준 기간"으로 쓰고, 그 직전 동일 길이 구간을 "비교 기간" 기본값으로 잡는다.
  // 이후에는 사용자가 직접 두 기간을 자유롭게 바꿀 수 있음 (연동 끊음)
  useEffect(() => {
    if (initialized.current || !defaultStart || !defaultEnd) return
    initialized.current = true
    setPeriodB({ start: defaultStart, end: defaultEnd })
    setPeriodA(previousPeriodOfSameLength(defaultStart, defaultEnd))
  }, [defaultStart, defaultEnd])

  const tableA = useMemo(() => buildAoPeriodTable(rows, periodA.start, periodA.end), [rows, periodA])
  const tableB = useMemo(() => buildAoPeriodTable(rows, periodB.start, periodB.end), [rows, periodB])

  const revenueA = tableA.reduce((s, r) => s + r.revenue, 0)
  const revenueB = tableB.reduce((s, r) => s + r.revenue, 0)
  const delta = calcPeriodDelta(revenueB, revenueA)

  const maxRows = Math.max(tableA.length, tableB.length)
  const hiddenCount = maxRows - PAGE_SIZE

  return (
    <div className="rounded-xl border border-[#e0e0e0] bg-white">
      <div className="border-b border-[#e0e0e0] px-4 py-3">
        <ChartSectionNote sectionId="ao_period_comparison" title="기간 비교" titleClassName="text-xs font-semibold text-[#1d1d1f]" />
        <p className="text-[10px] text-[#9CA3AF] mt-0.5">두 기간을 자유롭게 골라 캠페인 성과를 나란히 비교 (기본값: 바로 이전 동일 길이 기간)</p>
      </div>

      <div className="px-4 pt-3">
        <table className="text-xs">
          <thead>
            <tr className="text-[#9CA3AF]">
              <th className="pb-1.5 pr-4 text-left font-medium">기간</th>
              <th className="pb-1.5 pr-2 text-left font-medium">시작일</th>
              <th className="pb-1.5 pr-6 text-left font-medium">종료일</th>
            </tr>
          </thead>
          <tbody className="text-[#1d1d1f]">
            <tr>
              <td className="py-1 pr-4 text-[#6B7280]">비교 기간</td>
              <td className="py-1 pr-2"><DateField value={periodA.start} onChange={v => setPeriodA(p => ({ ...p, start: v }))} /></td>
              <td className="py-1 pr-6"><DateField value={periodA.end} onChange={v => setPeriodA(p => ({ ...p, end: v }))} /></td>
            </tr>
            <tr>
              <td className="py-1 pr-4 font-semibold">기준 기간</td>
              <td className="py-1 pr-2"><DateField value={periodB.start} onChange={v => setPeriodB(p => ({ ...p, start: v }))} /></td>
              <td className="py-1 pr-6"><DateField value={periodB.end} onChange={v => setPeriodB(p => ({ ...p, end: v }))} /></td>
            </tr>
          </tbody>
        </table>

        {delta !== null && (
          <p className="mt-2 text-xs text-[#6B7280]">
            전체 Revenue 증감{' '}
            <span className={cn('font-semibold', delta >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]')}>
              {delta >= 0 ? '▲' : '▼'} {Math.abs(delta * 100).toFixed(1)}%
            </span>
            <span className="text-[#9CA3AF]"> (비교 기간 대비 기준 기간)</span>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4 p-4 md:flex-row">
        <Leaderboard title="비교 기간" data={tableA} expanded={expanded} />
        <Leaderboard title="기준 기간" data={tableB} expanded={expanded} />
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
