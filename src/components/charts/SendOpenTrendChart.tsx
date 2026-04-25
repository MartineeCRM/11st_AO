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
import type { DailyComboPoint } from '@/types/metrics'
import { formatNumber } from '@/lib/formatters'

interface Props {
  data: DailyComboPoint[]
}

export function SendOpenTrendChart({ data }: Props) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 flex flex-col h-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#111827]">발송량 &amp; 반응 트렌드</h3>
          <p className="text-xs text-[#9CA3AF] mt-0.5">일별 Sent/Impression · Open/Click 추이</p>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="left"
              tickFormatter={v => formatNumber(v)}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip
              formatter={(value: number, name: string) => [formatNumber(value), name]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(value: string) => (
                <span style={{ color: '#6B7280' }}>{value}</span>
              )}
            />
            <Bar
              yAxisId="left"
              dataKey="sentImpression"
              name="Sent/Impression"
              fill="#4361EE"
              opacity={0.85}
              radius={[3, 3, 0, 0]}
              maxBarSize={40}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="openClick"
              name="Open/Click"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ r: 3, fill: '#10B981' }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
