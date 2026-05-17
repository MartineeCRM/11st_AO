import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatKorean, formatCurrency } from '@/lib/formatters'
import type { DailyRevenuePoint } from '@/types/metrics'
import { EmptyChartState } from '@/components/EmptyChartState'
import { ChartSectionNote } from './ChartSectionNote'
import { useChartColors } from '@/lib/chartColors'

interface Props {
  data: DailyRevenuePoint[]
}

export function AovRevenueComboChart({ data }: Props) {
  const colors = useChartColors()
  return (
    <div className="rounded-xl border border-[#e0e0e0] bg-white p-5 flex flex-col h-full">
      <div className="mb-4">
        <ChartSectionNote sectionId="perf_aov_revenue" title="Revenue / AOV 추이" />
      </div>
      <div className="flex-1 min-h-0">
        {data.length === 0 ? <EmptyChartState /> : <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 52, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            {/* 왼쪽 Y축: Revenue */}
            <YAxis
              yAxisId="left"
              tickFormatter={v => `₩${formatKorean(v as number)}`}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            {/* 오른쪽 Y축: AOV */}
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={v => formatCurrency(v as number)}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'Revenue') return [`₩${formatKorean(value)}`, name]
                return [formatCurrency(value), name]
              }}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e0e0e0' }}
            />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar
              yAxisId="left"
              dataKey="revenue"
              name="Revenue"
              fill={colors[0] + '99'}
              radius={[2, 2, 0, 0]}
              maxBarSize={20}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="aov"
              name="AOV"
              stroke={colors[2]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>}
      </div>
    </div>
  )
}
