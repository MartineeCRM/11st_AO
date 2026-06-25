import { useState, useEffect } from 'react'
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
import { ChartSectionNote } from './ChartSectionNote'
import { useChartColors } from '@/lib/chartColors'
import { calcIQRDomain } from '@/lib/outlier'

interface DailyEventPoint {
  date: string
  [key: string]: number | string
}

interface Props {
  kpiRows: DailyKpiRow[]
  /** H열 이후 원본 컬럼명 목록. 없으면 DailyKpiRow 기본 이벤트 컬럼 사용 */
  eventColumns?: { key: string; label: string }[]
}

const DEFAULT_EVENT_KEYS: { key: string; label: string }[] = [
  { key: 'complete_order_product', label: 'complete_order_product' },
  { key: 'first_purchase', label: 'first_purchase' },
  { key: 'like_brand', label: 'like_brand' },
  { key: 'like_product', label: 'like_product' },
  { key: 'view_cartpage', label: 'view_cartpage' },
  { key: 'view_product_detail', label: 'view_product_detail' },
  { key: 'view_promotion_list_page', label: 'view_promotion_list_page' },
]

export function CustomEventLineChart({ kpiRows, eventColumns }: Props) {
  const colors = useChartColors()
  const EVENTS = (eventColumns && eventColumns.length > 0 ? eventColumns : DEFAULT_EVENT_KEYS)
    .map((ev, i) => ({ ...ev, color: colors[i % colors.length] }))

  const [selected, setSelected] = useState<Set<string>>(
    new Set(DEFAULT_EVENT_KEYS.slice(0, 2).map(ev => ev.key)),
  )

  useEffect(() => {
    if (EVENTS.length > 0) {
      setSelected(new Set(EVENTS.slice(0, 2).map(ev => ev.key)))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventColumns])

  const data: DailyEventPoint[] = kpiRows
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(row => {
      const point: DailyEventPoint = { date: formatDateShort(row.date) }
      for (const ev of EVENTS) {
        point[ev.key] = Number((row as Record<string, unknown>)[ev.key]) || 0
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

  // Compute IQR domain across all active series combined
  const allActiveValues = activeEvents.flatMap(ev =>
    data.map(d => Number(d[ev.key])).filter(v => Number.isFinite(v)),
  )
  const eventOutlier = calcIQRDomain(allActiveValues)

  return (
    <div className="rounded-[18px] border border-[#e0e0e0] bg-white p-5 flex flex-col h-full">
      <div className="mb-3 flex items-start justify-between">
        <ChartSectionNote sectionId="perf_custom_event" title="커스텀 이벤트 일별 추이" />
        {eventOutlier.hasOutlier && (
          <span
            className="ml-2 shrink-0 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-medium text-[#92400E] cursor-default"
            title={`이상치 감지: 최댓값 ${formatKorean(eventOutlier.rawMax)} (Y축 클리핑됨)`}
          >
            ⚠ 이상치
          </span>
        )}
      </div>

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
              style={{ color: selected.has(ev.key) ? '#1d1d1f' : '#9CA3AF' }}
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
              domain={eventOutlier.domain}
              tickFormatter={v => formatKorean(v as number)}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip
              formatter={(value: number, name: string) => [formatKorean(value), name]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e0e0e0' }}
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
