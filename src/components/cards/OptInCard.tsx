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
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip as RTooltip } from 'recharts'
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

function MiniTrendChart({ data, color }: { data: { date: string; value: number }[]; color: string }) {
  return (
    <div className="px-1 pt-1">
      <p className="mb-1 text-[10px] font-medium text-[#9CA3AF]">최근 14일 추이</p>
      <ResponsiveContainer width="100%" height={40}>
        <LineChart data={data}>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} />
          <RTooltip
            labelFormatter={(label: string) => label}
            formatter={(v: number) => [formatNumber(v), '']}
            contentStyle={{ fontSize: 11 }}
            itemStyle={{ color: '#1d1d1f' }}
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
  const { label, icon, value, wow, trendData, color } = data
  const isPositive = wow > 0
  const isNegative = wow < 0

  return (
    <div className="rounded-[18px] border border-[#e0e0e0] bg-white px-4 pt-3 pb-2">
      {/* 상단: 아이콘 + 레이블 + 값 + WoW */}
      <div className={cn('flex items-center justify-between')}>
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0"
            style={{ background: `${color}1A` }}
          >
            <DynamicIcon name={icon} className="h-4 w-4" style={{ color }} />
          </div>
          <span className="text-xs font-medium text-[#6B7280]">{label}</span>
        </div>

        <span className="text-base font-bold text-[#1d1d1f]">{formatNumber(value)}</span>

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

      {/* 하단: 미니 트렌드 차트 */}
      {trendData.length > 0 && (
        <MiniTrendChart data={trendData} color={color} />
      )}
    </div>
  )
}
