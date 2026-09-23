import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber, formatCurrency, formatCountWithRate } from '@/lib/formatters'
import { buildAoPivot, listAoYears, monthLabel, shiftYears, calcYoY, sortByAoMetric, type AoSortKey, type AoPivotRow } from '@/lib/metrics'
import { AoSortSelect } from './filters/AoSortSelect'
import type { AoPushRow } from '@/types/sheets'

interface Props {
  /** AO 캠페인으로 이미 필터링된 행 (날짜 범위 필터는 적용하지 않음 — 이 테이블은 자체 연/월 범위를 가짐) */
  rows: AoPushRow[]
}

const DEFAULT_MONTHS = 3
const COLS_PER_MONTH = 5

interface ColumnGroup {
  year: string
  /** null이면 연도가 접혀서 연간 합계 하나로 표시됨 */
  month: string | null
  label: string
}

export function AoMonthlyPerformanceTable({ rows }: Props) {
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

  // 연관거래액 YoY 배지용 — 화면에 펼쳐지지 않은 전년도라도 비교값은 항상 계산해둔다
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
      return calcYoY(yoyRow.byMonth[g.month]?.grossAmount ?? 0, yoyRow.byMonth[priorMonth]?.grossAmount)
    }
    const priorYear = String(Number(g.year) - 1)
    return calcYoY(yoyRow.byYear[g.year]?.grossAmount ?? 0, yoyRow.byYear[priorYear]?.grossAmount)
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

  // 연도별로 접혀있으면 "연간 합계" 컬럼 1개, 펼쳐있으면 그 연도의 월별 컬럼들
  const columnGroups: ColumnGroup[] = pivot.years.flatMap(year => {
    if (collapsedYears.has(year)) {
      return [{ year, month: null, label: '연간 합계' }]
    }
    return pivot.monthsByYear[year].map(month => ({ year, month, label: monthLabel(month) }))
  })

  // 정렬 기준(연관거래액/수신/결제건수)은 현재 화면에 보이는 컬럼들의 합으로 계산
  function aggregateForSort(row: AoPivotRow) {
    let grossAmount = 0, sent = 0, paymentCount = 0
    for (const g of columnGroups) {
      const m = g.month ? row.byMonth[g.month] : row.byYear[g.year]
      if (!m) continue
      grossAmount += m.grossAmount
      sent += m.sent
      paymentCount += m.paymentCount
    }
    return { campaign: row.campaign, grossAmount, sent, paymentCount }
  }

  const sortedRows = sortByAoMetric(pivot.rows, sortKey, aggregateForSort)

  function updateScrollState() {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  // 컬럼 수가 바뀌면(연도 펼침/접힘) 스크롤 가능 여부를 다시 계산
  useEffect(() => {
    const id = requestAnimationFrame(updateScrollState)
    return () => cancelAnimationFrame(id)
  }, [columnGroups.length])

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
          <p className="text-xs font-semibold text-[#1d1d1f]">캠페인 × 월 실적표</p>
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
                const span = collapsed ? COLS_PER_MONTH : pivot.monthsByYear[year].length * COLS_PER_MONTH
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
                  colSpan={COLS_PER_MONTH}
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
                  <th className="border-b border-l border-[#E5E7EB] px-3 py-1.5 text-right text-[10px] font-medium text-[#9CA3AF]">수신</th>
                  <th className="border-b border-[#F3F4F6] px-3 py-1.5 text-right text-[10px] font-medium text-[#9CA3AF]">오픈</th>
                  <th className="border-b border-[#F3F4F6] px-3 py-1.5 text-right text-[10px] font-medium text-[#9CA3AF]">결제건수</th>
                  <th className="border-b border-[#F3F4F6] px-3 py-1.5 text-right text-[10px] font-medium text-[#9CA3AF]">결제회원수</th>
                  <th className="border-b border-[#F3F4F6] px-3 py-1.5 text-right text-[10px] font-medium text-[#9CA3AF]">연관거래액</th>
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
                  const base = m ? m.sent : 0
                  const rate = (count: number) => (base > 0 ? count / base : 0)
                  return (
                    <Fragment key={`${g.year}-${g.month ?? 'total'}`}>
                      <td className="border-b border-l border-[#E5E7EB] px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">
                        {m ? formatNumber(m.sent) : '-'}
                      </td>
                      <td className="border-b border-[#F3F4F6] px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">
                        {m ? formatCountWithRate(m.opens, rate(m.opens)) : '-'}
                      </td>
                      <td className="border-b border-[#F3F4F6] px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">
                        {m ? formatCountWithRate(m.paymentCount, rate(m.paymentCount)) : '-'}
                      </td>
                      <td className="border-b border-[#F3F4F6] px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">
                        {m ? formatCountWithRate(m.payingMembers, rate(m.payingMembers)) : '-'}
                      </td>
                      <td className="border-b border-[#F3F4F6] px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">
                        {m ? formatCurrency(m.grossAmount) : '-'}
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
