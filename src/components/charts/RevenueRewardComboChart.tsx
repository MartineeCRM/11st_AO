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
import { formatKorean } from '@/lib/formatters'
import type { DailyRevenuePoint } from '@/types/metrics'
import { EmptyChartState } from '@/components/EmptyChartState'
import { ChartSectionNote } from './ChartSectionNote'
import { useChartColors } from '@/lib/chartColors'

interface Props {
  data: DailyRevenuePoint[]
}

export function RevenueRewardComboChart({ data }: Props) {
  const colors = useChartColors()
  return (
    <div className="rounded-[18px] border border-[#e0e0e0] bg-white p-5 flex flex-col h-full">
      <div className="mb-4">
        <ChartSectionNote sectionId="perf_revenue_reward" title="발송당 Revenue / 예상 Reward 추이" />
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
            {/* 왼쪽 Y축: 발송당 Revenue */}
            <YAxis
              yAxisId="left"
              tickFormatter={v => formatKorean(v as number)}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            {/* 오른쪽 Y축: 예상 Reward (%) */}
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={v => `${(v as number).toFixed(3)}%`}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === '발송당 Revenue') return [formatKorean(value), name]
                return [`${value.toFixed(4)}%`, name]
              }}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e0e0e0' }}
            />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar
              yAxisId="left"
              dataKey="revenuePerSend"
              name="발송당 Revenue"
              fill={colors[1] + '99'}
              radius={[2, 2, 0, 0]}
              maxBarSize={20}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="expectedReward"
              name="예상 Reward"
              stroke={colors[5] ?? colors[4] ?? colors[1]}
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
