import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { KpiDelta } from '@/hooks/useAttributionMetrics'

interface DeltaBadgeProps {
  value: number | null
  label: string
}

function DeltaBadge({ value, label }: DeltaBadgeProps) {
  if (value === null) return null
  const pct = (Math.round(value * 10000) / 100).toFixed(1)
  const positive = value >= 0
  const zero = value === 0

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[10px] font-medium',
        zero ? 'text-[#9CA3AF]' : positive ? 'text-[#10B981]' : 'text-[#EF4444]',
      )}
    >
      {zero
        ? <Minus className="h-2.5 w-2.5" />
        : positive
          ? <TrendingUp className="h-2.5 w-2.5" />
          : <TrendingDown className="h-2.5 w-2.5" />}
      {label} {positive && !zero ? '+' : ''}{pct}%
    </span>
  )
}

interface AttributionKpiCardProps {
  title: string
  value: string
  subValue?: string          // CVR 카드에서 두 번째 값
  subLabel?: string
  delta: KpiDelta
  highlighted?: boolean      // 현재 선택된 토글
}

export function AttributionKpiCard({
  title,
  value,
  subValue,
  subLabel,
  delta,
  highlighted = false,
}: AttributionKpiCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 rounded-xl border bg-white p-3 transition-all',
        highlighted
          ? 'border-[#4361EE] shadow-sm shadow-[#4361EE]/10'
          : 'border-[#E5E7EB]',
      )}
    >
      <p className="text-[11px] font-medium text-[#9CA3AF]">{title}</p>
      <p className="text-lg font-bold leading-none text-[#111827]">{value}</p>
      {subValue && subLabel && (
        <p className="text-xs text-[#6B7280]">
          <span className="font-medium text-[#374151]">{subValue}</span>
          <span className="ml-1 text-[10px]">{subLabel}</span>
        </p>
      )}
      <div className="flex flex-col gap-1 pt-1">
        {delta.wow !== null && (
          <div className="flex items-center gap-1 rounded-md bg-[#FFFBEB] px-1.5 py-0.5">
            <span className="text-[9px] font-semibold text-[#D97706]">WoW</span>
            <DeltaBadge value={delta.wow} label="" />
          </div>
        )}
        {delta.mom !== null && (
          <div className="flex items-center gap-1 rounded-md bg-[#F0FDF4] px-1.5 py-0.5">
            <span className="text-[9px] font-semibold text-[#16A34A]">MoM</span>
            <DeltaBadge value={delta.mom} label="" />
          </div>
        )}
      </div>
    </div>
  )
}
