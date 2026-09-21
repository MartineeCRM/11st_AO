import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChartSectionNote } from './charts/ChartSectionNote'
import { formatNumber, formatCurrency } from '@/lib/formatters'
import { buildAoPivot, listAoYears, monthLabel, shiftYears, calcYoY, sortByAoMetric, type AoSortKey, type AoPivotRow } from '@/lib/metrics'
import { AoSortSelect } from './filters/AoSortSelect'
import type { MartineeUnionRow } from '@/types/sheets'

interface Props {
  /** AO 캠페인으로 이미 필터링된 행 (날짜 범위 필터는 적용하지 않음 — 이 테이블은 자체 연/월 범위를 가짐) */
  rows: MartineeUnionRow[]
}

const DEFAULT_MONTHS = 3

interface ColumnGroup {
  year: string
  /** null이면 연도가 접혀서 연간 합계 하나로 표시됨 */
  month: string | null
  label: string
}

export function AoMonthlyPerformanceTable({ rows }: Props) {
  const [showExtra, setShowExtra] = useState(false)
  const [sortKey, setSortKey] = useState<AoSortKey>('name')
  const [revealedYears, setRevealedYears] = useState<string[]>([])
  const [collapsedYears, setCollapsedYears] = useState<Set<string>>(new Set())
  const initialized = useRef(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const allYears = useMemo(() => listAoYears(rows), [rows])

  // 데이터가 처음 로드되면 최근 3개월이 속한 연도만 기본으로 펼침
  useEffect(() => {
    if (initialized.current || rows.length === 0) return
    initialized.current = true
    const recentMonths = [...new Set(rows.map(r => r.date.slice(0, 7)))].sort().reverse().slice(0, DEFAULT_MONTHS)
    const years = [...new Set(recentMonths.map(m => m.slice(0, 4)))].sort().reverse()
    setRevealedYears(years)
  }, [rows])

  const pivot = useMemo(() => buildAoPivot(rows, revealedYears), [rows, revealedYears])

  // Revenue YoY 배지용 — 화면에 펼쳐지지 않은 전년도라도 비교값은 항상 계산해둔다
  const comparisonYears = useMemo(
    () => [...new Set(revealedYears.flatMap(y => [y, String(Number(y) - 1)]))],
    [revealedYears],
  )
  const yoyPivot = useMemo(() => buildAoPivot(rows, comparisonYears), [rows, comparisonYears])
  const yoyByCampaign = useMemo(
    () => new Map(yoyPivot.rows.map(r => [r.campaign, r])),
    [yoyPivot],
  )

  function revenueYoY(campaign: string, g: ColumnGroup): number | null {
    const yoyRow = yoyByCampaign.get(campaign)
    if (!yoyRow) return null
    if (g.month) {
      const priorMonth = shiftYears(g.month, -1)
      return calcYoY(yoyRow.byMonth[g.month]?.revenue ?? 0, yoyRow.byMonth[priorMonth]?.revenue)
    }
    const priorYear = String(Number(g.year) - 1)
    return calcYoY(yoyRow.byYear[g.year]?.revenue ?? 0, yoyRow.byYear[priorYear]?.revenue)
  }

  const nextYear = allYears.find(y => !revealedYears.includes(y))

  function revealPreviousYear() {
    if (!nextYear) return
    setRevealedYears(prev => [...prev, nextYear].sort().reverse())
    setCollapsedYears(prev => new Set(prev).add(nextYear))
  }

  function toggleYear(year: string) {
    setCollapsedYears(prev => {
      const next = new Set(prev)
      if (next.has(year)) next.delete(year)
      else next.add(year)
      return next
    })
  }

  const colsPerMonth = showExtra ? 7 : 5

  // 연도별로 접혀있으면 "연간 합계" 컬럼 1개, 펼쳐있으면 그 연도의 월별 컬럼들
  const columnGroups: ColumnGroup[] = pivot.years.flatMap(year => {
    if (collapsedYears.has(year)) {
      return [{ year, month: null, label: '연간 합계' }]
    }
    return pivot.monthsByYear[year].map(month => ({ year, month, label: monthLabel(month) }))
  })

  // 정렬 기준(Revenue/발송·노출/Conversion A)은 현재 화면에 보이는 컬럼들의 합으로 계산
  function aggregateForSort(row: AoPivotRow) {
    let revenue = 0, sent = 0, impressions = 0, conversionA = 0
    for (const g of columnGroups) {
      const m = g.month ? row.byMonth[g.month] : row.byYear[g.year]
      if (!m) continue
      revenue += m.revenue
      sent += m.sent
      impressions += m.impressions
      conversionA += m.conversionA
    }
    return { campaign: row.campaign, revenue, sent, impressions, conversionA }
  }

  const sortedRows = sortByAoMetric(pivot.rows, sortKey, aggregateForSort)

  function updateScrollState() {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  // 컬럼 수가 바뀌면(연도 펼침/접힘, C/D 토글) 스크롤 가능 여부를 다시 계산
  useEffect(() => {
    const id = requestAnimationFrame(updateScrollState)
    return () => cancelAnimationFrame(id)
  }, [columnGroups.length, showExtra])

  function scrollByPage(direction: 1 | -1) {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  if (pivot.rows.length === 0) return null

  const canScrollAtAll = canScrollLeft || canScrollRight

  return (
    <div className="rounded-xl border border-[#e0e0e0] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e0e0e0] px-4 py-3">
        <div>
          <ChartSectionNote sectionId="ao_monthly_table" title="캠페인 × 월 실적표" titleClassName="text-xs font-semibold text-[#1d1d1f]" />
          <p className="text-[10px] text-[#9CA3AF] mt-0.5">그 달에 발송한 캠페인만 표시 · 연도 클릭 시 접기/펼치기</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <AoSortSelect value={sortKey} onChange={setSortKey} />

          {nextYear && (
            <button
              onClick={revealPreviousYear}
              className="rounded-lg border border-[#e0e0e0] bg-[#F9FAFB] px-2.5 py-1.5 text-xs font-medium text-[#6B7280] hover:text-[#1d1d1f]"
            >
              + {nextYear}년 데이터 보기
            </button>
          )}

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

          {canScrollAtAll && (
            <div className="flex items-center overflow-hidden rounded-lg border border-[#e0e0e0]">
              <button
                onClick={() => scrollByPage(-1)}
                disabled={!canScrollLeft}
                className="flex items-center justify-center bg-[#F9FAFB] px-1.5 py-1.5 text-[#6B7280] hover:text-[#1d1d1f] disabled:opacity-30 disabled:hover:text-[#6B7280]"
                title="왼쪽으로 스크롤"
              >
                <ChevronLeft size={14} />
              </button>
              <div className="h-4 w-px bg-[#e0e0e0]" />
              <button
                onClick={() => scrollByPage(1)}
                disabled={!canScrollRight}
                className="flex items-center justify-center bg-[#F9FAFB] px-1.5 py-1.5 text-[#6B7280] hover:text-[#1d1d1f] disabled:opacity-30 disabled:hover:text-[#6B7280]"
                title="오른쪽으로 스크롤"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div ref={scrollRef} onScroll={updateScrollState} className="overflow-x-auto">
        <table className="w-full min-w-max border-separate border-spacing-0">
          <thead>
            {/* 연도 행 — 클릭해서 접기/펼치기 */}
            <tr>
              <th className="sticky left-0 z-20 border-b border-r border-[#E5E7EB] bg-[#F3F4F6] px-4 py-1.5" />
              {pivot.years.map(year => {
                const collapsed = collapsedYears.has(year)
                const span = collapsed ? colsPerMonth : pivot.monthsByYear[year].length * colsPerMonth
                return (
                  <th
                    key={year}
                    colSpan={span}
                    className="border-b border-l border-[#E5E7EB] bg-[#F3F4F6] px-3 py-1.5 text-center"
                  >
                    <button
                      onClick={() => toggleYear(year)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#1d1d1f] hover:text-[#0066cc]"
                    >
                      {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {year}년
                    </button>
                  </th>
                )
              })}
            </tr>
            {/* 월(또는 연간 합계) 행 */}
            <tr className="bg-[#F9FAFB]">
              <th className="sticky left-0 z-20 border-b border-r border-[#E5E7EB] bg-[#F9FAFB] px-4 py-1.5" />
              {columnGroups.map(g => (
                <th
                  key={`${g.year}-${g.month ?? 'total'}`}
                  colSpan={colsPerMonth}
                  className="border-b border-l border-[#E5E7EB] px-3 py-1.5 text-center text-[11px] font-semibold text-[#1d1d1f]"
                >
                  {g.label}
                </th>
              ))}
            </tr>
            {/* 지표 행 */}
            <tr className="bg-[#F9FAFB]">
              <th className="sticky left-0 z-20 border-b border-r border-[#E5E7EB] bg-[#F9FAFB] px-4 py-1.5 text-left text-[11px] font-semibold text-[#6B7280]">
                캠페인명
              </th>
              {columnGroups.map(g => (
                <Fragment key={`${g.year}-${g.month ?? 'total'}`}>
                  <th className="border-b border-l border-[#E5E7EB] px-3 py-1.5 text-right text-[10px] font-medium text-[#9CA3AF]">노출</th>
                  <th className="border-b border-[#F3F4F6] px-3 py-1.5 text-right text-[10px] font-medium text-[#9CA3AF]">발송</th>
                  <th className="border-b border-[#F3F4F6] px-3 py-1.5 text-right text-[10px] font-medium text-[#9CA3AF]">Conv A</th>
                  <th className="border-b border-[#F3F4F6] px-3 py-1.5 text-right text-[10px] font-medium text-[#9CA3AF]">Conv B</th>
                  <th className="border-b border-[#F3F4F6] px-3 py-1.5 text-right text-[10px] font-medium text-[#9CA3AF]">Revenue</th>
                  {showExtra && (
                    <>
                      <th className="border-b border-[#F3F4F6] px-3 py-1.5 text-right text-[10px] font-medium text-[#9CA3AF]">Conv C</th>
                      <th className="border-b border-[#F3F4F6] px-3 py-1.5 text-right text-[10px] font-medium text-[#9CA3AF]">Conv D</th>
                    </>
                  )}
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, idx) => (
              <tr key={row.campaign} className={cn('hover:bg-[#F3F8FF]', idx % 2 === 1 && 'bg-[#FAFAFB]')}>
                <td
                  className={cn(
                    'sticky left-0 z-10 w-[260px] max-w-[260px] whitespace-normal break-words border-b border-r border-[#E5E7EB] px-4 py-2 text-xs font-medium text-[#1d1d1f]',
                    idx % 2 === 1 ? 'bg-[#FAFAFB]' : 'bg-white',
                  )}
                >
                  {row.campaign}
                </td>
                {columnGroups.map(g => {
                  const m = g.month ? row.byMonth[g.month] : row.byYear[g.year]
                  return (
                    <Fragment key={`${g.year}-${g.month ?? 'total'}`}>
                      <td className="border-b border-l border-[#E5E7EB] px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">
                        {m ? formatNumber(m.impressions) : '-'}
                      </td>
                      <td className="border-b border-[#F3F4F6] px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">
                        {m ? formatNumber(m.sent) : '-'}
                      </td>
                      <td className="border-b border-[#F3F4F6] px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">
                        {m ? formatNumber(m.conversionA) : '-'}
                      </td>
                      <td className="border-b border-[#F3F4F6] px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">
                        {m ? formatNumber(m.conversionB) : '-'}
                      </td>
                      <td className="border-b border-[#F3F4F6] px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">
                        {m ? formatCurrency(m.revenue) : '-'}
                        {(() => {
                          const yoy = m ? revenueYoY(row.campaign, g) : null
                          if (yoy === null) return null
                          return (
                            <div className={cn('text-[10px] font-medium', yoy >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]')}>
                              {yoy >= 0 ? '▲' : '▼'} {Math.abs(yoy * 100).toFixed(0)}%
                            </div>
                          )
                        })()}
                      </td>
                      {showExtra && (
                        <>
                          <td className="border-b border-[#F3F4F6] px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">
                            {m ? formatNumber(m.conversionC) : '-'}
                          </td>
                          <td className="border-b border-[#F3F4F6] px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">
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
    </div>
  )
}
