import { Fragment, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { ChartSectionNote } from './charts/ChartSectionNote'
import { formatNumber, formatCurrency } from '@/lib/formatters'
import { buildAoMonthlyPivot, monthLabel } from '@/lib/metrics'
import type { MartineeUnionRow } from '@/types/sheets'

interface Props {
  /** AO 캠페인으로 이미 필터링된 행 (날짜 범위 필터는 적용하지 않음 — 이 테이블은 자체 월 범위를 가짐) */
  rows: MartineeUnionRow[]
}

const DEFAULT_MONTHS = 3
const MAX_MONTHS = 24

export function AoMonthlyPerformanceTable({ rows }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [showExtra, setShowExtra] = useState(false)

  const totalMonthsAvailable = useMemo(
    () => new Set(rows.map(r => r.date.slice(0, 7))).size,
    [rows],
  )
  const visibleMonthCount = expanded ? Math.min(totalMonthsAvailable, MAX_MONTHS) : DEFAULT_MONTHS
  const pivot = useMemo(() => buildAoMonthlyPivot(rows, visibleMonthCount), [rows, visibleMonthCount])

  if (pivot.rows.length === 0) return null

  const hiddenMonths = totalMonthsAvailable - DEFAULT_MONTHS
  const colsPerMonth = showExtra ? 7 : 5

  return (
    <div className="rounded-xl border border-[#e0e0e0] bg-white">
      <div className="flex items-center justify-between border-b border-[#e0e0e0] px-4 py-3">
        <div>
          <ChartSectionNote sectionId="ao_monthly_table" title="월별 AO 캠페인 실적" titleClassName="text-xs font-semibold text-[#1d1d1f]" />
          <p className="text-[10px] text-[#9CA3AF] mt-0.5">그 달에 발송한 캠페인만 표시 · 캠페인명 가나다순</p>
        </div>
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-max">
          <thead>
            <tr className="border-b border-[#e0e0e0] bg-[#F9FAFB]">
              <th className="sticky left-0 z-10 bg-[#F9FAFB] px-4 py-2 text-left text-[11px] font-semibold text-[#6B7280]">
                캠페인명
              </th>
              {pivot.months.map(month => (
                <th
                  key={month}
                  colSpan={colsPerMonth}
                  className="border-l border-[#e0e0e0] px-3 py-2 text-center text-[11px] font-semibold text-[#1d1d1f]"
                >
                  {monthLabel(month)}
                </th>
              ))}
            </tr>
            <tr className="border-b border-[#e0e0e0] bg-[#F9FAFB]">
              <th className="sticky left-0 z-10 bg-[#F9FAFB] px-4 py-1.5" />
              {pivot.months.map(month => (
                <Fragment key={month}>
                  <th className="border-l border-[#e0e0e0] px-3 py-1.5 text-right text-[10px] font-medium text-[#9CA3AF]">노출</th>
                  <th className="px-3 py-1.5 text-right text-[10px] font-medium text-[#9CA3AF]">발송</th>
                  <th className="px-3 py-1.5 text-right text-[10px] font-medium text-[#9CA3AF]">Conv A</th>
                  <th className="px-3 py-1.5 text-right text-[10px] font-medium text-[#9CA3AF]">Conv B</th>
                  <th className="px-3 py-1.5 text-right text-[10px] font-medium text-[#9CA3AF]">Revenue</th>
                  {showExtra && (
                    <>
                      <th className="px-3 py-1.5 text-right text-[10px] font-medium text-[#9CA3AF]">Conv C</th>
                      <th className="px-3 py-1.5 text-right text-[10px] font-medium text-[#9CA3AF]">Conv D</th>
                    </>
                  )}
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {pivot.rows.map(row => (
              <tr key={row.campaign} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                <td className="sticky left-0 z-10 max-w-[220px] truncate bg-white px-4 py-2 text-xs font-medium text-[#1d1d1f]">
                  {row.campaign}
                </td>
                {pivot.months.map(month => {
                  const m = row.months[month]
                  return (
                    <Fragment key={month}>
                      <td className="border-l border-[#F3F4F6] px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">
                        {m ? formatNumber(m.impressions) : '-'}
                      </td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">
                        {m ? formatNumber(m.sent) : '-'}
                      </td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">
                        {m ? formatNumber(m.conversionA) : '-'}
                      </td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">
                        {m ? formatNumber(m.conversionB) : '-'}
                      </td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">
                        {m ? formatCurrency(m.revenue) : '-'}
                      </td>
                      {showExtra && (
                        <>
                          <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">
                            {m ? formatNumber(m.conversionC) : '-'}
                          </td>
                          <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">
                            {m ? formatNumber(m.conversionD) : '-'}
                          </td>
                        </>
                      )}
                    </Fragment>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hiddenMonths > 0 && (
        <div className="border-t border-[#F3F4F6] px-4 py-2.5 text-center">
          <button onClick={() => setExpanded(v => !v)} className="text-xs font-medium text-[#0066cc] hover:underline">
            {expanded ? '접기' : `이전 ${hiddenMonths}개월 더 보기`}
          </button>
        </div>
      )}
    </div>
  )
}
