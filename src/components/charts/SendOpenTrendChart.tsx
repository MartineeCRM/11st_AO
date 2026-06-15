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
import { formatKorean } from '@/lib/formatters'
import { ChartSectionNote } from './ChartSectionNote'
import { useChartColors } from '@/lib/chartColors'

interface Props {
  data: DailyComboPoint[]
}

export function SendOpenTrendChart({ data }: Props) {
  const colors = useChartColors()
  return (
    <div className="rounded-xl border border-[#e0e0e0] bg-white p-5 flex flex-col h-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <ChartSectionNote sectionId="ops_send_trend" title="발송량 & 반응 트렌드" />
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
              orientation="left"
              tickFormatter={v => formatKorean(v)}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={v => `${(v * 100).toFixed(1)}%`}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip
              formatter={(value: number, name: string) =>
                name === 'CTR'
                  ? [`${(value * 100).toFixed(2)}%`, name]
                  : [formatKorean(value), name]
              }
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e0e0e0' }}
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
              fill={colors[0]}
              opacity={0.85}
              radius={[3, 3, 0, 0]}
              maxBarSize={40}
            />
            <Bar
              yAxisId="left"
              dataKey="openClick"
              name="Open/Click"
              fill={colors[1]}
              opacity={0.85}
              radius={[3, 3, 0, 0]}
              maxBarSize={40}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="ctr"
              name="CTR"
              stroke={colors[2]}
              strokeWidth={2}
              dot={{ r: 3, fill: colors[2] }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
