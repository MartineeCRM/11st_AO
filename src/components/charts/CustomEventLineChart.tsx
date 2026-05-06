import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { formatKorean, formatDateShort } from '@/lib/formatters'
import type { DailyKpiRow } from '@/types/sheets'
import { useChartColors } from '@/lib/chartColors'

const EVENT_KEYS: { key: keyof Omit<DailyKpiRow, 'date'>; label: string }[] = [
  { key: 'complete_order_product', label: '구매 제품 수' },
  { key: 'first_purchase', label: '첫 구매' },
  { key: 'like_brand', label: '브랜드 좋아요' },
  { key: 'like_product', label: '제품 좋아요' },
  { key: 'view_cartpage', label: '카트 조회' },
  { key: 'view_product_detail', label: '제품 상세 조회' },
  { key: 'view_promotion_list_page', label: '프로모션 조회' },
]

interface DailyEventPoint {
  date: string
  [key: string]: number | string
}

interface Props {
  kpiRows: DailyKpiRow[]
}

export function CustomEventLineChart({ kpiRows }: Props) {
  const colors = useChartColors()
  const EVENTS = EVENT_KEYS.map((ev, i) => ({ ...ev, color: colors[i % colors.length] }))

  const [selected, setSelected] = useState<Set<string>>(
    new Set(['complete_order_product', 'first_purchase']),
  )

  const data: DailyEventPoint[] = kpiRows
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(row => {
      const point: DailyEventPoint = { date: formatDateShort(row.date) }
      for (const ev of EVENTS) {
        point[ev.key] = Number(row[ev.key]) || 0
      }
      return point
    })

  function toggle(key: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const activeEvents = EVENTS.filter(ev => selected.has(ev.key))

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 flex flex-col h-full">
      <h3 className="mb-3 text-sm font-semibold text-[#111827]">커스텀 이벤트 일별 추이</h3>

      {/* 이벤트 선택 체크박스 */}
      <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1.5">
        {EVENTS.map(ev => (
          <label
            key={ev.key}
            className="flex cursor-pointer items-center gap-1.5 select-none"
            onClick={() => toggle(ev.key)}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm flex-shrink-0"
              style={{
                background: selected.has(ev.key) ? ev.color : '#D1D5DB',
              }}
            />
            <span
              className="text-[11px]"
              style={{ color: selected.has(ev.key) ? '#374151' : '#9CA3AF' }}
            >
              {ev.label}
            </span>
          </label>
        ))}
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={v => formatKorean(v as number)}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip
              formatter={(value: number, name: string) => [formatKorean(value), name]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
            />
            {activeEvents.length > 1 && (
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
            )}
            {activeEvents.map(ev => (
              <Line
                key={ev.key}
                type="monotone"
                dataKey={ev.key}
                name={ev.label}
                stroke={ev.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
