import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatDateShort } from '@/lib/formatters'
import type { TrendPoint, EventTrendPoint } from '@/hooks/useAttributionMetrics'

interface PurchaseTrendChartProps {
  data: TrendPoint[]
  yLabel: string
  formatter: (v: number) => string
}

export function PurchaseTrendChart({ data, yLabel, formatter }: PurchaseTrendChartProps) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateShort}
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={formatter}
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            tickLine={false}
            axisLine={false}
            width={60}
            label={{ value: yLabel, angle: -90, position: 'insideLeft', fontSize: 10, fill: '#9CA3AF' }}
          />
          <Tooltip
            formatter={(v: number) => [formatter(v), '']}
            labelFormatter={formatDateShort}
            contentStyle={{ fontSize: 12, borderColor: '#E5E7EB', borderRadius: 8 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value) => {
              const map: Record<string, string> = {
                value: '현재',
                wow_value: 'WoW (-7일)',
                mom_value: 'MoM (-30일)',
              }
              return map[value] ?? value
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#4361EE"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="wow_value"
            stroke="#F59E0B"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="mom_value"
            stroke="#10B981"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

interface EventTrendChartProps {
  data: EventTrendPoint[]
  eventLabel: string
}

export function EventTrendChart({ data, eventLabel }: EventTrendChartProps) {
  function formatPct(v: number) {
    return `${(v * 100).toFixed(2)}%`
  }

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateShort}
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={formatPct}
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip
            formatter={(v: number) => [formatPct(v), eventLabel]}
            labelFormatter={formatDateShort}
            contentStyle={{ fontSize: 12, borderColor: '#E5E7EB', borderRadius: 8 }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#4361EE"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
