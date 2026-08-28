import { useState } from 'react'
import {
  AlertTriangle,
  Bell,
  BellRing,
  CircleDollarSign,
  MessageCircle,
  MessageSquare,
  Minus,
  MousePointerClick,
  Send,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, Tooltip as RTooltip } from 'recharts'
import { cn } from '@/lib/utils'
import { formatWoW } from '@/lib/formatters'
import { RateWithCount } from '@/components/RateWithCount'
import type { KpiCardData } from '@/types/metrics'

const ICON_MAP = {
  bell: Bell,
  'bell-ring': BellRing,
  'circle-dollar-sign': CircleDollarSign,
  'message-circle': MessageCircle,
  'message-square': MessageSquare,
  'mouse-pointer-click': MousePointerClick,
  send: Send,
  users: Users,
} as const

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name as keyof typeof ICON_MAP]
  if (!Icon) return null
  return <Icon className={className} />
}

function WowBadge({ value }: { value: number }) {
  const isPositive = value > 0
  const isNegative = value < 0
  return (
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
        {formatWoW(value)}
      </span>
    </div>
  )
}

function MiniTrendChart({ data }: { data: number[] }) {
  const points = data.map((v, i) => ({ i, v }))
  return (
    <div className="w-[200px] rounded-[18px] border border-[#e0e0e0] bg-white p-3 shadow-lg">
      <p className="mb-1.5 text-[11px] font-medium text-[#6B7280]">최근 14일 추이</p>
      <ResponsiveContainer width="100%" height={60}>
        <LineChart data={points}>
          <Line
            type="monotone"
            dataKey="v"
            stroke="#0066cc"
            strokeWidth={1.5}
            dot={false}
          />
          <RTooltip
            formatter={(v: number) => [v.toLocaleString(), '']}
            contentStyle={{ fontSize: 11 }}
            itemStyle={{ color: '#1d1d1f' }}
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
  const { label, formattedValue, wow, mom, trendData, icon, anomaly, primary } = data

  return (
    <div
      className={cn('relative min-w-0', primary ? 'flex-[1.6]' : 'flex-1')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={cn(
          'rounded-[18px] border bg-white transition-shadow',
          primary ? 'p-5' : 'p-4',
          anomaly ? 'border-[#FCA5A5]' : 'border-[#e0e0e0]',
          hovered && 'shadow-md',
        )}
      >
        {/* 레이블 + 아이콘 */}
        <div className="mb-2 flex items-center justify-between">
          <span className={cn('font-medium text-[#6B7280]', primary ? 'text-sm' : 'text-xs')}>{label}</span>
          <div className="flex items-center gap-1">
            {anomaly && (
              <AlertTriangle className="h-3.5 w-3.5 text-[#F59E0B]" title="이상 감지: WoW 변동 과다" />
            )}
            <DynamicIcon name={icon} className={cn(primary ? 'h-4 w-4' : 'h-3.5 w-3.5', 'text-[#9CA3AF]')} />
          </div>
        </div>

        {/* 값 */}
        <p className={cn('mb-2 font-bold text-[#1d1d1f] leading-none', primary ? 'text-3xl' : 'text-2xl')}>
          <RateWithCount value={formattedValue} countClassName={primary ? 'text-lg' : 'text-base'} />
        </p>

        {/* WoW + MoM */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            <WowBadge value={wow} />
            <span className="text-[10px] text-[#9CA3AF]">vs 지난주</span>
          </div>
          {mom != null && (
            <div className="flex items-center gap-1">
              <WowBadge value={mom} />
              <span className="text-[10px] text-[#9CA3AF]">vs 전월</span>
            </div>
          )}
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
