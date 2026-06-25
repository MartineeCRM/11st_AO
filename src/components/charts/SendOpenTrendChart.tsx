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
import { calcIQRDomain, extractValues } from '@/lib/outlier'

interface Props {
  data: DailyComboPoint[]
}

export function SendOpenTrendChart({ data }: Props) {
  const colors = useChartColors()
  const siOutlier = calcIQRDomain(extractValues(data, 'sentImpression'))
  const ocOutlier = calcIQRDomain(extractValues(data, 'openClick'))
  const ctrOutlier = calcIQRDomain(extractValues(data, 'ctr'))
  const leftDomain: [number, number] = [0, Math.max(siOutlier.domain[1], ocOutlier.domain[1])]
  const hasOutlier = siOutlier.hasOutlier || ocOutlier.hasOutlier || ctrOutlier.hasOutlier
  return (
    <div className="rounded-xl border border-[#e0e0e0] bg-white p-5 flex flex-col h-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <ChartSectionNote sectionId="ops_send_trend" title="발송량 & 반응 트렌드" />
          <p className="text-xs text-[#9CA3AF] mt-0.5">일별 Sent/Impression · Open/Click 추이</p>
        </div>
        {hasOutlier && (
          <span
            className="shrink-0 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-medium text-[#92400E] cursor-default"
            title={`이상치 감지: 발송/노출 최댓값 ${formatKorean(siOutlier.rawMax)} (Y축 클리핑됨)`}
          >
            ⚠ 이상치
          </span>
        )}
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
              domain={leftDomain}
              tickFormatter={v => formatKorean(v)}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={ctrOutlier.domain}
              tickFormatter={v => `${v.toFixed(1)}%`}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip
              formatter={(value: number, name: string) =>
                name === 'CTR'
                  ? [`${value.toFixed(2)}%`, name]
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
