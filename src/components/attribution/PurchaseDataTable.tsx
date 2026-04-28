import { useState, useMemo } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber, formatRate, formatCurrency } from '@/lib/formatters'
import { sumRows, calcPurchaseMetrics } from '@/lib/attributionMetrics'
import type { AttDataRow } from '@/types/sheets'

type GroupBy = 'day' | 'week' | 'month'

interface RowData {
  label: string
  key: string
  user_cvr: number
  count_cvr: number
  purchase_count: number
  revenue: number
  aov: number
  arppu: number
  frequency: number
  items_per_order: number
  items_per_user: number
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
  const mm = (d.getMonth() + 1).toString().padStart(2, '0')
  const dd = d.getDate().toString().padStart(2, '0')
  const em = (end.getMonth() + 1).toString().padStart(2, '0')
  const ed = end.getDate().toString().padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd} ~ ${em}-${ed}`
}

function metricsFromRows(rows: AttDataRow[], label: string, key: string): RowData {
  const sums = sumRows(rows)
  const m = calcPurchaseMetrics(sums)
  return {
    label,
    key,
    user_cvr: m.user_cvr,
    count_cvr: m.count_cvr,
    purchase_count: m.purchase_count,
    revenue: m.revenue,
    aov: m.aov,
    arppu: m.arppu,
    frequency: m.frequency,
    items_per_order: m.items_per_order,
    items_per_user: m.items_per_user,
  }
}

function buildRows(rows: AttDataRow[], groupBy: GroupBy): RowData[] {
  if (groupBy === 'day') {
    const byDate = new Map<string, AttDataRow[]>()
    for (const r of rows) {
      const list = byDate.get(r.date) ?? []
      list.push(r)
      byDate.set(r.date, list)
    }
    return [...byDate.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, rs]) => metricsFromRows(rs, date, date))
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
        const parent = metricsFromRows(rs, getWeekLabel(wk), wk)
        const byDate = new Map<string, AttDataRow[]>()
        for (const r of rs) {
          const list = byDate.get(r.date) ?? []
          list.push(r)
          byDate.set(r.date, list)
        }
        parent.children = [...byDate.entries()]
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([date, drs]) => metricsFromRows(drs, date, `${wk}-${date}`))
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
      const parent = metricsFromRows(rs, mo, mo)
      const byDate = new Map<string, AttDataRow[]>()
      for (const r of rs) {
        const list = byDate.get(r.date) ?? []
        list.push(r)
        byDate.set(r.date, list)
      }
      parent.children = [...byDate.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, drs]) => metricsFromRows(drs, date, `${mo}-${date}`))
      return parent
    })
}

const COLS = [
  { key: 'user_cvr', label: '유저CVR', fmt: (v: number) => formatRate(v) },
  { key: 'count_cvr', label: '건수CVR', fmt: (v: number) => formatRate(v) },
  { key: 'purchase_count', label: 'Purchase', fmt: (v: number) => formatNumber(v) },
  { key: 'revenue', label: 'Revenue', fmt: (v: number) => formatNumber(v) },
  { key: 'aov', label: 'AOV', fmt: (v: number) => formatCurrency(v) },
  { key: 'arppu', label: 'ARPPU', fmt: (v: number) => formatCurrency(v) },
  { key: 'frequency', label: 'Frequency', fmt: (v: number) => v.toFixed(2) },
  { key: 'items_per_order', label: '주문당제품수', fmt: (v: number) => v.toFixed(2) },
  { key: 'items_per_user', label: '유저당제품주문수', fmt: (v: number) => v.toFixed(2) },
] as const

function TableRow({ row, depth = 0 }: { row: RowData; depth?: number }) {
  const [open, setOpen] = useState(false)
  const hasChildren = (row.children?.length ?? 0) > 0

  return (
    <>
      <tr className={cn('border-b border-[#F3F4F6] hover:bg-[#F9FAFB]', depth > 0 && 'bg-[#FAFAFA]')}>
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
            <span className={cn('text-xs', depth === 0 ? 'font-semibold text-[#374151]' : 'text-[#6B7280]')}>
              {row.label}
            </span>
          </button>
        </td>
        {COLS.map(col => (
          <td key={col.key} className="px-3 py-2 text-right text-xs text-[#374151] tabular-nums">
            {col.fmt(row[col.key])}
          </td>
        ))}
      </tr>
      {open && row.children?.map(child => (
        <TableRow key={child.key} row={child} depth={depth + 1} />
      ))}
    </>
  )
}

interface Props {
  rows: AttDataRow[]
}

export function PurchaseDataTable({ rows }: Props) {
  const [groupBy, setGroupBy] = useState<GroupBy>('day')

  const tableRows = useMemo(() => buildRows(rows, groupBy), [rows, groupBy])

  const GROUP_OPTIONS: { key: GroupBy; label: string }[] = [
    { key: 'month', label: '월별' },
    { key: 'week', label: '주차별' },
    { key: 'day', label: '일자별' },
  ]

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
        <p className="text-xs font-semibold text-[#374151]">일자별 구매 지표</p>
        <div className="flex gap-1">
          {GROUP_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setGroupBy(opt.key)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                groupBy === opt.key
                  ? 'bg-[#4361EE] text-white'
                  : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <th className="sticky left-0 z-10 bg-[#F9FAFB] px-3 py-2 text-left text-[11px] font-semibold text-[#6B7280]">
                날짜
              </th>
              {COLS.map(col => (
                <th key={col.key} className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.length === 0 ? (
              <tr>
                <td colSpan={COLS.length + 1} className="py-8 text-center text-xs text-[#9CA3AF]">
                  데이터 없음
                </td>
              </tr>
            ) : (
              tableRows.map(row => <TableRow key={row.key} row={row} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
