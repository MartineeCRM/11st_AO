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
import type { AoTrendPoint } from '@/lib/metrics'
import { formatKorean, formatCurrency } from '@/lib/formatters'
import { useChartColors } from '@/lib/chartColors'
import { SegmentedToggle } from '@/components/filters/SegmentedToggle'

interface Props {
  campaignName: string
  data: AoTrendPoint[]
  granularity: 'day' | 'week' | 'month'
  onGranularityChange: (g: 'day' | 'week' | 'month') => void
}

export function AoCampaignTrendChart({ campaignName, data, granularity, onGranularityChange }: Props) {
  const colors = useChartColors()

  return (
    <div className="rounded-xl border border-[#e0e0e0] bg-white p-5 flex flex-col h-full">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#1d1d1f]">{campaignName || '캠페인을 선택하세요'}</p>
          <p className="text-xs text-[#9CA3AF] mt-0.5">발송/노출 · Conversion A · Revenue 추이</p>
        </div>
        <SegmentedToggle
          value={granularity}
          onChange={onGranularityChange}
          options={[
            { key: 'day', label: '일별' },
            { key: 'week', label: '주별' },
            { key: 'month', label: '월별' },
          ]}
        />
      </div>

      <div className="flex-1 min-h-0">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-[#9CA3AF]">데이터 없음</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis
                dataKey="period"
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
                tickFormatter={v => formatKorean(v)}
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <YAxis yAxisId="revenue" hide domain={['auto', 'auto']} />
              <Tooltip
                formatter={(value: number, name: string) =>
                  name === 'Revenue' ? [formatCurrency(value), name] : [formatKorean(value), name]
                }
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e0e0e0' }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                formatter={(value: string) => <span style={{ color: '#6B7280' }}>{value}</span>}
              />
              <Bar
                yAxisId="left"
                dataKey="sentImpression"
                name="발송/노출"
                fill={colors[0]}
                opacity={0.85}
                radius={[3, 3, 0, 0]}
                maxBarSize={40}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="conversionA"
                name="Conversion A"
                stroke={colors[1]}
                strokeWidth={2}
                dot={{ r: 3, fill: colors[1] }}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke={colors[2]}
                strokeWidth={2}
                dot={{ r: 3, fill: colors[2] }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
