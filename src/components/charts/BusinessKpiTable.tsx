import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, Tooltip as RTooltip } from 'recharts'
import { cn } from '@/lib/utils'
import { formatWoW } from '@/lib/formatters'
import type { BusinessKpiRow } from '@/types/metrics'
import { useChartColors } from '@/lib/chartColors'
import { ChartSectionNote } from './ChartSectionNote'

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const points = data.map((v, i) => ({ i, v }))
  return (
    <div className="w-20 h-7">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
          />
          <RTooltip
            formatter={(v: number) => [v.toLocaleString('ko-KR'), '']}
            contentStyle={{ fontSize: 10 }}
            itemStyle={{ color: '#1d1d1f' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function ChangeCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[#9CA3AF] text-xs">-</span>
  const isPos = value > 0
  const isNeg = value < 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium',
        isPos ? 'text-[#10B981]' : isNeg ? 'text-[#EF4444]' : 'text-[#9CA3AF]',
      )}
    >
      {isPos ? <TrendingUp className="h-3 w-3" /> : isNeg ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
      {formatWoW(value)}
    </span>
  )
}

interface Props {
  rows: BusinessKpiRow[]
}

export function BusinessKpiTable({ rows }: Props) {
  const colors = useChartColors()
  const [compareMode, setCompareMode] = useState<'mom' | 'yoy'>('mom')

  return (
    <div className="rounded-xl border border-[#e0e0e0] bg-white p-5 flex flex-col h-full">
      <div className="mb-4 flex items-center justify-between">
        <ChartSectionNote sectionId="perf_business_kpi" title="비즈니스 지표 기간 비교" />
        <div className="flex rounded-md border border-[#e0e0e0] overflow-hidden text-[11px]">
          <button
            onClick={() => setCompareMode('mom')}
            className={cn(
              'px-2.5 py-1 font-medium transition-colors',
              compareMode === 'mom' ? 'bg-[#0066cc] text-white' : 'text-[#6B7280] hover:bg-[#F3F4F6]',
            )}
          >
            MoM
          </button>
          <button
            onClick={() => setCompareMode('yoy')}
            className={cn(
              'px-2.5 py-1 font-medium transition-colors border-l border-[#e0e0e0]',
              compareMode === 'yoy' ? 'bg-[#0066cc] text-white' : 'text-[#6B7280] hover:bg-[#F3F4F6]',
            )}
          >
            YoY
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#e0e0e0]">
              <th className="pb-2 text-[11px] font-medium text-[#6B7280] w-36">지표</th>
              <th className="pb-2 text-[11px] font-medium text-[#6B7280] text-right">현재값</th>
              <th className="pb-2 text-[11px] font-medium text-[#6B7280] text-center">WoW</th>
              <th className="pb-2 text-[11px] font-medium text-[#6B7280] text-center">
                {compareMode === 'mom' ? 'MoM' : 'YoY'}
              </th>
              <th className="pb-2 text-[11px] font-medium text-[#6B7280] text-center">30일 추이</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.metric}
                className={cn(
                  'border-b border-[#F3F4F6] last:border-0',
                  i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]',
                )}
              >
                <td className="py-2.5 text-xs font-medium text-[#1d1d1f]">{row.metric}</td>
                <td className="py-2.5 text-xs font-semibold text-[#1d1d1f] text-right">
                  {row.formattedCurrent}
                </td>
                <td className="py-2.5 text-center">
                  <ChangeCell value={row.wow} />
                </td>
                <td className="py-2.5 text-center">
                  <ChangeCell value={compareMode === 'mom' ? row.mom : row.yoy} />
                </td>
                <td className="py-2.5">
                  <div className="flex justify-center">
                    <MiniSparkline data={row.trend} color={colors[0]} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
