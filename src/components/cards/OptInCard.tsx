import { useState } from 'react'
import {
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
import { formatNumber, formatWoW } from '@/lib/formatters'
import type { OptInData } from '@/types/metrics'

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

function DynamicIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const Icon = ICON_MAP[name as keyof typeof ICON_MAP]
  if (!Icon) return null
  return <Icon className={className} style={style} />
}

function MiniTrendChart({ data, color }: { data: number[]; color: string }) {
  const points = data.map((v, i) => ({ i, v }))
  return (
    <div className="w-[180px] rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-lg">
      <p className="mb-1.5 text-[11px] font-medium text-[#6B7280]">최근 14일 추이</p>
      <ResponsiveContainer width="100%" height={50}>
        <LineChart data={points}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
          <RTooltip
            formatter={(v: number) => [formatNumber(v), '']}
            contentStyle={{ fontSize: 11 }}
            itemStyle={{ color: '#374151' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

interface Props {
  data: OptInData
}

export function OptInCard({ data }: Props) {
  const [hovered, setHovered] = useState(false)
  const { label, icon, value, wow, trendData, color } = data
  const isPositive = wow > 0
  const isNegative = wow < 0

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={cn(
          'flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 transition-shadow',
          hovered && 'shadow-md',
        )}
      >
        {/* 아이콘 + 레이블 */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0"
            style={{ background: `${color}1A` }}
          >
            <DynamicIcon name={icon} className="h-4 w-4" style={{ color }} />
          </div>
          <span className="text-xs font-medium text-[#6B7280]">{label}</span>
        </div>

        {/* 값 */}
        <span className="text-base font-bold text-[#111827]">{formatNumber(value)}</span>

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
            {formatWoW(wow)} WoW
          </span>
        </div>
      </div>

      {/* 호버 미니차트 */}
      {hovered && trendData.length > 0 && (
        <div className="absolute right-4 top-full z-50 mt-2">
          <MiniTrendChart data={trendData} color={color} />
        </div>
      )}
    </div>
  )
}
