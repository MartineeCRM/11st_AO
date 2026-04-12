import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Top10Item, Top10Metric } from '@/types/metrics'

const METRICS: Top10Metric[] = ['Revenue', '구매 CVR', '발송/노출량', '오픈/클릭율', 'CTR', 'AOV']

interface Props {
  data: Top10Item[]
  metric: Top10Metric
  onMetricChange: (m: Top10Metric) => void
}

export function Top10BarChart({ data, metric, onMetricChange }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const maxVal = Math.max(...data.map(d => d.value), 1)

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 flex flex-col h-full">
      {/* 헤더 */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#111827]">캠페인 성과 Top 10</h3>
        <div className="flex items-center gap-2">
          {/* Campaign / Canvas 탭 */}
          <div className="flex rounded-md border border-[#E5E7EB] bg-[#F3F4F6] p-0.5 text-xs">
            <span className="rounded px-2.5 py-1 font-medium bg-white text-[#374151] shadow-sm">
              Campaign
            </span>
          </div>

          {/* 기준 지표 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(o => !o)}
              className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1.5 text-xs font-medium text-[#374151]"
            >
              {metric}
              <ChevronDown className="h-3 w-3 text-[#9CA3AF]" />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border border-[#E5E7EB] bg-white shadow-lg py-1">
                {METRICS.map(m => (
                  <button
                    key={m}
                    onClick={() => { onMetricChange(m); setDropdownOpen(false) }}
                    className={cn(
                      'block w-full px-3 py-1.5 text-left text-xs hover:bg-[#F9FAFB]',
                      m === metric ? 'font-semibold text-[#4361EE]' : 'text-[#374151]',
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
                tick={{ fontSize: 11, fill: '#374151' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => String(v).length > 14 ? `${String(v).slice(0, 14)}…` : String(v)}
              />
              <Tooltip
                formatter={(_: number, __: string, props: { payload?: Top10Item }) => [
                  props.payload?.formattedValue ?? '',
                  metric,
                ]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
              />
              <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={18}>
                <LabelList
                  dataKey="formattedValue"
                  position="right"
                  style={{ fontSize: 11, fill: '#374151' }}
                />
                {data.map((entry, i) => {
                  const opacity = 0.4 + 0.6 * (entry.value / maxVal)
                  return <Cell key={i} fill={`rgba(67, 97, 238, ${opacity})`} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
