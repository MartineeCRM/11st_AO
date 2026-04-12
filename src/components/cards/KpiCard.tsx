import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, Tooltip as RTooltip } from 'recharts'
import { cn } from '@/lib/utils'
import { formatWoW } from '@/lib/formatters'
import type { KpiCardData } from '@/types/metrics'
import * as LucideIcons from 'lucide-react'

type LucideIconName = keyof typeof LucideIcons

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const pascal = name
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('') as LucideIconName
  const Icon = LucideIcons[pascal] as React.ComponentType<{ className?: string }> | undefined
  if (!Icon) return null
  return <Icon className={className} />
}

function MiniTrendChart({ data }: { data: number[] }) {
  const points = data.map((v, i) => ({ i, v }))
  return (
    <div className="w-[200px] rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-lg">
      <p className="mb-1.5 text-[11px] font-medium text-[#6B7280]">최근 14일 추이</p>
      <ResponsiveContainer width="100%" height={60}>
        <LineChart data={points}>
          <Line
            type="monotone"
            dataKey="v"
            stroke="#4361EE"
            strokeWidth={1.5}
            dot={false}
          />
          <RTooltip
            formatter={(v: number) => [v.toLocaleString(), '']}
            contentStyle={{ fontSize: 11 }}
            itemStyle={{ color: '#374151' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

interface Props {
  data: KpiCardData
}

export function KpiCard({ data }: Props) {
  const [hovered, setHovered] = useState(false)
  const { label, formattedValue, wow, trendData, icon } = data
  const isPositive = wow > 0
  const isNegative = wow < 0

  return (
    <div
      className="relative flex-1 min-w-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={cn(
          'rounded-xl border border-[#E5E7EB] bg-white p-4 transition-shadow',
          hovered && 'shadow-md',
        )}
      >
        {/* 레이블 + 아이콘 */}
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-[#6B7280]">{label}</span>
          <DynamicIcon name={icon} className="h-3.5 w-3.5 text-[#9CA3AF]" />
        </div>

        {/* 값 */}
        <p className="mb-2 text-2xl font-bold text-[#111827] leading-none">{formattedValue}</p>

        {/* WoW */}
        <div className="flex items-center gap-1">
          {isPositive ? (
            <TrendingUp className="h-3.5 w-3.5 text-[#10B981]" />
          ) : isNegative ? (
            <TrendingDown className="h-3.5 w-3.5 text-[#EF4444]" />
          ) : (
            <Minus className="h-3.5 w-3.5 text-[#9CA3AF]" />
          )}
          <span
            className={cn(
              'text-[11px] font-medium',
              isPositive ? 'text-[#10B981]' : isNegative ? 'text-[#EF4444]' : 'text-[#9CA3AF]',
            )}
          >
            {formatWoW(wow)} vs 지난주
          </span>
        </div>
      </div>

      {/* 호버 미니차트 툴팁 */}
      {hovered && trendData.length > 0 && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2">
          <MiniTrendChart data={trendData} />
        </div>
      )}
    </div>
  )
}
