import { useState, useMemo } from 'react'
import { ChevronRight, ChevronDown, Settings2 } from 'lucide-react'
import { ChartSectionNote } from '@/components/charts/ChartSectionNote'
import { cn } from '@/lib/utils'
import { formatRate, formatCurrency, formatKorean } from '@/lib/formatters'
import { sumRows, calcPurchaseMetrics, calcDelta, offsetDate } from '@/lib/attributionMetrics'
import { getTarget, saveTarget, distributeTarget, calcProgress, type MonthlyTarget } from '@/lib/purchaseTargets'
import type { AttDataRow } from '@/types/sheets'

type GroupBy = 'day' | 'week' | 'month'

interface RowData {
  label: string
  key: string
  dateKey: string         // YYYY-MM-DD (일자) or YYYY-MM-DD (주 시작) or YYYY-MM (월)
  groupBy: GroupBy
  user_cvr: number
  count_cvr: number
  purchase_count: number
  revenue: number
  aov: number
  arppu: number
  frequency: number
  items_per_order: number
  items_per_user: number
  revenue_mom: number | null
  revenue_yoy: number | null
  purchase_mom: number | null
  purchase_yoy: number | null
  elapsedDays: number     // 진척도 계산용 경과 일수
  children?: RowData[]
}

function getWeekKey(date: string): string {
  const d = new Date(date)
  const day = d.getDay()
  const mon = new Date(d)
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return mon.toISOString().slice(0, 10)
}

function getWeekLabel(weekStart: string): string {
  const d = new Date(weekStart)
  const end = new Date(d)
  end.setDate(d.getDate() + 6)
  const fmt = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
  return `${fmt(d)} ~ ${fmt(end)}`
}

function daysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

function metricsFromRows(
  rows: AttDataRow[],
  allRows: AttDataRow[],
  label: string,
  key: string,
  dateKey: string,
  groupBy: GroupBy,
  elapsedDays: number,
): RowData {
  const sums = sumRows(rows)
  const m = calcPurchaseMetrics(sums)

  // MoM / YoY: 같은 날짜들에서 -30일/-365일 offset 매핑
  const dates = [...new Set(rows.map(r => r.date))]
  const byDate = new Map<string, AttDataRow[]>()
  for (const r of allRows) {
    const list = byDate.get(r.date) ?? []
    list.push(r)
    byDate.set(r.date, list)
  }

  const momRows = dates.flatMap(d => byDate.get(offsetDate(d, -30)) ?? [])
  const yoyRows = dates.flatMap(d => byDate.get(offsetDate(d, -365)) ?? [])

  const momMetrics = momRows.length > 0 ? calcPurchaseMetrics(sumRows(momRows)) : null
  const yoyMetrics = yoyRows.length > 0 ? calcPurchaseMetrics(sumRows(yoyRows)) : null

  return {
    label, key, dateKey, groupBy, elapsedDays,
    user_cvr: m.user_cvr,
    count_cvr: m.count_cvr,
    purchase_count: m.purchase_count,
    revenue: m.revenue,
    aov: m.aov,
    arppu: m.arppu,
    frequency: m.frequency,
    items_per_order: m.items_per_order,
    items_per_user: m.items_per_user,
    revenue_mom: momMetrics ? calcDelta(m.revenue, momMetrics.revenue) : null,
    revenue_yoy: yoyMetrics ? calcDelta(m.revenue, yoyMetrics.revenue) : null,
    purchase_mom: momMetrics ? calcDelta(m.purchase_count, momMetrics.purchase_count) : null,
    purchase_yoy: yoyMetrics ? calcDelta(m.purchase_count, yoyMetrics.purchase_count) : null,
  }
}

const today = new Date().toISOString().slice(0, 10)

function calcElapsed(dates: string[]): number {
  const sorted = [...dates].sort()
  const last = sorted[sorted.length - 1]
  const first = sorted[0]
  if (!first || !last) return 0
  const effectiveLast = last <= today ? last : today
  const msPerDay = 86_400_000
  return Math.max(1, Math.round((new Date(effectiveLast).getTime() - new Date(first).getTime()) / msPerDay) + 1)
}

function buildRows(rows: AttDataRow[], groupBy: GroupBy, allRows: AttDataRow[]): RowData[] {
  if (groupBy === 'day') {
    const byDate = new Map<string, AttDataRow[]>()
    for (const r of rows) {
      const list = byDate.get(r.date) ?? []
      list.push(r)
      byDate.set(r.date, list)
    }
    return [...byDate.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, rs]) =>
        metricsFromRows(rs, allRows, date, date, date, 'day', calcElapsed([date])),
      )
  }

  if (groupBy === 'week') {
    const byWeek = new Map<string, AttDataRow[]>()
    for (const r of rows) {
      const wk = getWeekKey(r.date)
      const list = byWeek.get(wk) ?? []
      list.push(r)
      byWeek.set(wk, list)
    }
    return [...byWeek.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([wk, rs]) => {
        const dates = rs.map(r => r.date)
        const parent = metricsFromRows(rs, allRows, getWeekLabel(wk), wk, wk, 'week', calcElapsed(dates))
        const byDate = new Map<string, AttDataRow[]>()
        for (const r of rs) {
          const list = byDate.get(r.date) ?? []
          list.push(r)
          byDate.set(r.date, list)
        }
        parent.children = [...byDate.entries()]
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([date, drs]) =>
            metricsFromRows(drs, allRows, date, `${wk}-${date}`, date, 'day', calcElapsed([date])),
          )
        return parent
      })
  }

  // month
  const byMonth = new Map<string, AttDataRow[]>()
  for (const r of rows) {
    const mo = r.date.slice(0, 7)
    const list = byMonth.get(mo) ?? []
    list.push(r)
    byMonth.set(mo, list)
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([mo, rs]) => {
      const dates = rs.map(r => r.date)
      const parent = metricsFromRows(rs, allRows, mo, mo, mo, 'month', calcElapsed(dates))
      const byDate = new Map<string, AttDataRow[]>()
      for (const r of rs) {
        const list = byDate.get(r.date) ?? []
        list.push(r)
        byDate.set(r.date, list)
      }
      parent.children = [...byDate.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, drs]) =>
          metricsFromRows(drs, allRows, date, `${mo}-${date}`, date, 'day', calcElapsed([date])),
        )
      return parent
    })
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[#9CA3AF]">—</span>
  const pct = (value * 100).toFixed(1)
  const positive = value >= 0
  return (
    <span className={cn('text-[11px] font-medium', positive ? 'text-[#10B981]' : 'text-[#EF4444]')}>
      {positive ? '+' : ''}{pct}%
    </span>
  )
}

function ProgressBar({ value, elapsedDays, dailyTarget }: {
  value: number
  elapsedDays: number
  dailyTarget: number
}) {
  const progress = calcProgress(value, dailyTarget, elapsedDays)
  if (progress === null) return <span className="text-[#9CA3AF] text-[11px]">—</span>
  const pct = progress * 100
  const barColor = pct >= 100 ? '#10B981' : pct >= 80 ? '#0066cc' : '#EF4444'
  return (
    <div className="flex flex-col gap-0.5 min-w-[72px]">
      <div className="h-1.5 w-full rounded-full bg-[#e0e0e0] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }}
        />
      </div>
      <span className="text-[11px] font-medium tabular-nums" style={{ color: barColor }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  )
}

const BASE_COLS = [
  { key: 'user_cvr', label: '유저CVR', fmt: (v: number) => formatRate(v) },
  { key: 'count_cvr', label: '건수CVR', fmt: (v: number) => formatRate(v) },
  { key: 'purchase_count', label: 'Purchase', fmt: (v: number) => formatKorean(v) },
  { key: 'revenue', label: 'Revenue', fmt: (v: number) => formatKorean(v) },
  { key: 'aov', label: 'AOV', fmt: (v: number) => formatCurrency(v) },
  { key: 'arppu', label: 'ARPPU', fmt: (v: number) => formatCurrency(v) },
  { key: 'frequency', label: 'Frequency', fmt: (v: number) => v.toFixed(2) },
  { key: 'items_per_order', label: '주문당제품수', fmt: (v: number) => v.toFixed(2) },
  { key: 'items_per_user', label: '유저당제품주문수', fmt: (v: number) => v.toFixed(2) },
] as const

interface TableRowProps {
  row: RowData
  depth?: number
  target: MonthlyTarget | null
  dailyTarget: MonthlyTarget | null
  compareMode: 'mom' | 'yoy'
}

function TableRow({ row, depth = 0, target, dailyTarget, compareMode }: TableRowProps) {
  const [open, setOpen] = useState(false)
  const hasChildren = (row.children?.length ?? 0) > 0
  const showProgress = target !== null && dailyTarget !== null && depth === 0

  return (
    <>
      <tr className={cn('border-b border-[#F3F4F6] hover:bg-[#F9FAFB]', depth > 0 && 'bg-[#FAFAFA]')}>
        {/* 날짜 */}
        <td className="sticky left-0 z-10 bg-inherit px-3 py-2">
          <button
            className="flex items-center gap-1 text-left"
            style={{ paddingLeft: depth * 16 }}
            onClick={() => hasChildren && setOpen(o => !o)}
            disabled={!hasChildren}
          >
            {hasChildren
              ? open
                ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" />
                : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" />
              : <span className="w-3.5" />}
            <span className={cn('text-xs', depth === 0 ? 'font-semibold text-[#1d1d1f]' : 'text-[#6B7280]')}>
              {row.label}
            </span>
          </button>
        </td>

        {/* 기본 지표 컬럼 */}
        {BASE_COLS.map(col => (
          <td key={col.key} className="px-3 py-2 text-right text-xs text-[#1d1d1f] tabular-nums">
            {col.fmt(row[col.key as keyof RowData] as number)}
          </td>
        ))}

        {/* Purchase 비교 */}
        <td className="px-3 py-2 text-right">
          <DeltaBadge value={compareMode === 'mom' ? row.purchase_mom : row.purchase_yoy} />
        </td>

        {/* Revenue 비교 */}
        <td className="px-3 py-2 text-right">
          <DeltaBadge value={compareMode === 'mom' ? row.revenue_mom : row.revenue_yoy} />
        </td>

        {/* 진척도 */}
        {target !== null && (
          <>
            <td className="px-3 py-2 text-right">
              {showProgress
                ? <ProgressBar value={row.purchase_count} elapsedDays={row.elapsedDays} dailyTarget={dailyTarget!.purchase_count} />
                : <span className="text-[#9CA3AF] text-[11px]">—</span>}
            </td>
            <td className="px-3 py-2 text-right">
              {showProgress
                ? <ProgressBar value={row.revenue} elapsedDays={row.elapsedDays} dailyTarget={dailyTarget!.revenue} />
                : <span className="text-[#9CA3AF] text-[11px]">—</span>}
            </td>
          </>
        )}
      </tr>

      {open && row.children?.map(child => (
        <TableRow key={child.key} row={child} depth={depth + 1} target={target} dailyTarget={dailyTarget} compareMode={compareMode} />
      ))}
    </>
  )
}

interface Props {
  rows: AttDataRow[]
  allRows?: AttDataRow[]
}

function parseLocaleNumber(s: string): number {
  return Number(s.replace(/,/g, ''))
}

export function PurchaseDataTable({ rows, allRows }: Props) {
  const [groupBy, setGroupBy] = useState<GroupBy>('day')
  const [showTargetPanel, setShowTargetPanel] = useState(false)
  const [compareMode, setCompareMode] = useState<'mom' | 'yoy'>('mom')

  // 현재 데이터 기준 월 (최신 날짜 기준)
  const currentMonth = useMemo(() => {
    const dates = rows.map(r => r.date).filter(Boolean).sort()
    const last = dates[dates.length - 1]
    return last ? last.slice(0, 7) : new Date().toISOString().slice(0, 7)
  }, [rows])

  const [savedTarget, setSavedTarget] = useState<MonthlyTarget | null>(() => getTarget(currentMonth))

  // 타겟 입력 임시 상태
  const [inputRevenue, setInputRevenue] = useState(() => savedTarget?.revenue.toString() ?? '')
  const [inputPurchase, setInputPurchase] = useState(() => savedTarget?.purchase_count.toString() ?? '')

  const dailyTarget = useMemo(() => {
    if (!savedTarget) return null
    const { daily } = distributeTarget(currentMonth, savedTarget)
    return daily
  }, [savedTarget, currentMonth])

  const extRows = allRows ?? rows
  const tableRows = useMemo(() => buildRows(rows, groupBy, extRows), [rows, groupBy, extRows])

  const GROUP_OPTIONS: { key: GroupBy; label: string }[] = [
    { key: 'month', label: '월별' },
    { key: 'week', label: '주차별' },
    { key: 'day', label: '일자별' },
  ]

  function handleSave() {
    const revenue = parseLocaleNumber(inputRevenue)
    const purchase_count = parseLocaleNumber(inputPurchase)
    if (isNaN(revenue) || isNaN(purchase_count)) return
    const t: MonthlyTarget = { revenue, purchase_count }
    saveTarget(currentMonth, t)
    setSavedTarget(t)
    setShowTargetPanel(false)
  }

  function handleCancel() {
    setInputRevenue(savedTarget?.revenue.toString() ?? '')
    setInputPurchase(savedTarget?.purchase_count.toString() ?? '')
    setShowTargetPanel(false)
  }

  // 타겟 설정 패널 열 때 현재 저장값으로 초기화
  function handleOpenPanel() {
    const t = getTarget(currentMonth)
    setSavedTarget(t)
    setInputRevenue(t?.revenue.toString() ?? '')
    setInputPurchase(t?.purchase_count.toString() ?? '')
    setShowTargetPanel(true)
  }

  const colSpanTotal = BASE_COLS.length + 1 + 2 + (savedTarget ? 2 : 0)

  return (
    <div className="rounded-xl border border-[#e0e0e0] bg-white">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-[#e0e0e0] px-4 py-3">
        <ChartSectionNote sectionId="att_purchase_table" title="일자별 구매 지표" titleClassName="text-xs font-semibold text-[#1d1d1f]" />
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenPanel}
            className="flex items-center gap-1 rounded-md border border-[#e0e0e0] px-2.5 py-1 text-xs font-medium text-[#6B7280] hover:bg-[#F9FAFB] transition-colors"
          >
            <Settings2 className="h-3 w-3" />
            타겟 설정
          </button>
          {/* MoM / YoY 토글 */}
          <div className="flex rounded-md border border-[#e0e0e0] overflow-hidden text-[11px]">
            <button
              onClick={() => setCompareMode('mom')}
              className={cn(
                'px-2.5 py-1 font-medium transition-colors',
                compareMode === 'mom' ? 'bg-[#0066cc] text-white' : 'text-[#6B7280] hover:bg-[#F3F4F6]',
              )}
            >
              MoM
            </button>
            <button
              onClick={() => setCompareMode('yoy')}
              className={cn(
                'px-2.5 py-1 font-medium transition-colors border-l border-[#e0e0e0]',
                compareMode === 'yoy' ? 'bg-[#0066cc] text-white' : 'text-[#6B7280] hover:bg-[#F3F4F6]',
              )}
            >
              YoY
            </button>
          </div>
          <div className="flex gap-1">
            {GROUP_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setGroupBy(opt.key)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  groupBy === opt.key
                    ? 'bg-[#0066cc] text-white'
                    : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#e0e0e0]',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 타겟 설정 패널 */}
      {showTargetPanel && (
        <div className="border-b border-[#e0e0e0] bg-[#F9FAFB] px-5 py-4">
          <p className="mb-3 text-xs font-semibold text-[#1d1d1f]">
            월간 타겟 설정 — {currentMonth.replace('-', '년 ')}월
          </p>
          <div className="flex flex-col gap-2.5 max-w-sm">
            <div className="flex items-center gap-3">
              <span className="w-20 text-xs text-[#6B7280]">Revenue</span>
              <input
                type="text"
                value={inputRevenue}
                onChange={e => setInputRevenue(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="예: 2000000000"
                className="flex-1 rounded-lg border border-[#e0e0e0] bg-white px-3 py-1.5 text-xs text-[#1d1d1f] focus:border-[#0066cc] focus:outline-none tabular-nums"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="w-20 text-xs text-[#6B7280]">구매건수</span>
              <input
                type="text"
                value={inputPurchase}
                onChange={e => setInputPurchase(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="예: 50000"
                className="flex-1 rounded-lg border border-[#e0e0e0] bg-white px-3 py-1.5 text-xs text-[#1d1d1f] focus:border-[#0066cc] focus:outline-none tabular-nums"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleCancel}
              className="rounded-lg border border-[#e0e0e0] px-3 py-1.5 text-xs font-medium text-[#6B7280] hover:bg-white transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="rounded-lg bg-[#0066cc] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3451d1] transition-colors"
            >
              저장
            </button>
          </div>
        </div>
      )}

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr className="border-b border-[#e0e0e0] bg-[#F9FAFB]">
              <th className="sticky left-0 z-10 bg-[#F9FAFB] px-3 py-2 text-left text-[11px] font-semibold text-[#6B7280]">
                날짜
              </th>
              {BASE_COLS.map(col => (
                <th key={col.key} className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">
                  {col.label}
                </th>
              ))}
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">
                Purchase {compareMode === 'mom' ? 'MoM' : 'YoY'}
              </th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">
                Revenue {compareMode === 'mom' ? 'MoM' : 'YoY'}
              </th>
              {/* 진척도 */}
              {savedTarget && (
                <>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">Purchase 진척도</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">Revenue 진척도</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {tableRows.length === 0 ? (
              <tr>
                <td colSpan={colSpanTotal} className="py-8 text-center text-xs text-[#9CA3AF]">
                  데이터 없음
                </td>
              </tr>
            ) : (
              tableRows.map(row => (
                <TableRow
                  key={row.key}
                  row={row}
                  target={savedTarget}
                  dailyTarget={dailyTarget}
                  compareMode={compareMode}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
