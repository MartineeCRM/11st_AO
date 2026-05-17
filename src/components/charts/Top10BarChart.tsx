import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Top10Item, Top10Metric } from '@/types/metrics'
import { ChartSectionNote } from './ChartSectionNote'
import { useChartColors } from '@/lib/chartColors'

const METRICS: Top10Metric[] = ['Revenue', '구매 CVR', '발송/노출량', '오픈/클릭율', 'CTR', 'AOV']

interface Props {
  data: Top10Item[]
  metric: Top10Metric
  onMetricChange: (m: Top10Metric) => void
}

export function Top10BarChart({ data, metric, onMetricChange }: Props) {
  const colors = useChartColors()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const maxVal = Math.max(...data.map(d => d.value), 1)

  return (
    <div className="rounded-[18px] border border-[#e0e0e0] bg-white p-5 flex flex-col h-full">
      {/* 헤더 */}
      <div className="mb-4 flex items-center justify-between">
        <ChartSectionNote sectionId="perf_top10" title="캠페인 성과 Top 10" />
        <div className="flex items-center gap-2">
          {/* Campaign / Canvas 탭 */}
          <div className="flex rounded-md border border-[#e0e0e0] bg-[#F3F4F6] p-0.5 text-xs">
            <span className="rounded px-2.5 py-1 font-medium bg-white text-[#1d1d1f] shadow-sm">
              Campaign
            </span>
          </div>

          {/* 기준 지표 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(o => !o)}
              className="flex items-center gap-1.5 rounded-lg border border-[#e0e0e0] bg-[#F9FAFB] px-2.5 py-1.5 text-xs font-medium text-[#1d1d1f]"
            >
              {metric}
              <ChevronDown className="h-3 w-3 text-[#9CA3AF]" />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border border-[#e0e0e0] bg-white shadow-lg py-1">
                {METRICS.map(m => (
                  <button
                    key={m}
                    onClick={() => { onMetricChange(m); setDropdownOpen(false) }}
                    className={cn(
                      'block w-full px-3 py-1.5 text-left text-xs hover:bg-[#F9FAFB]',
                      m === metric ? 'font-semibold text-[#0066cc]' : 'text-[#1d1d1f]',
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 차트 (높이 고정) */}
      <div style={{ height: 320 }}>
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-[#9CA3AF]">데이터가 없습니다</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 0, right: 80, left: 4, bottom: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={{ fontSize: 11, fill: '#1d1d1f' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => String(v).length > 14 ? `${String(v).slice(0, 14)}…` : String(v)}
              />
              <Tooltip
                formatter={(_: number, __: string, props: { payload?: Top10Item }) => [
                  props.payload?.formattedValue ?? '',
                  metric,
                ]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e0e0e0' }}
              />
              <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={18}>
                <LabelList
                  dataKey="formattedValue"
                  position="right"
                  style={{ fontSize: 11, fill: '#1d1d1f' }}
                />
                {data.map((entry, i) => {
                  const opacity = 0.4 + 0.6 * (entry.value / maxVal)
                  const base = colors[0] ?? '#0066cc'
                  // hex → rgba
                  const r = parseInt(base.slice(1, 3), 16)
                  const g = parseInt(base.slice(3, 5), 16)
                  const b = parseInt(base.slice(5, 7), 16)
                  return <Cell key={i} fill={`rgba(${r}, ${g}, ${b}, ${opacity})`} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
