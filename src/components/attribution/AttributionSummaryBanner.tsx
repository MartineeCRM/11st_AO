import { ShoppingBag, TrendingUp, Users } from 'lucide-react'
import { formatKorean, formatRate } from '@/lib/formatters'
import type { PurchaseMetrics } from '@/lib/attributionMetrics'

interface Props {
  current: PurchaseMetrics
  hasData: boolean
}

export function AttributionSummaryBanner({ current, hasData }: Props) {
  if (!hasData) {
    return (
      <div className="mx-6 mb-5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-5 py-3">
        <p className="text-sm text-[#9CA3AF]">선택한 기간에 Attribution 데이터가 없습니다.</p>
      </div>
    )
  }

  const items = [
    {
      icon: TrendingUp,
      label: 'CRM 기여 매출',
      value: `₩${formatKorean(Math.round(current.revenue))}`,
      color: '#4361EE',
    },
    {
      icon: ShoppingBag,
      label: '기여 구매 건수',
      value: `${formatKorean(current.purchase_count)}건`,
      color: '#10B981',
    },
    {
      icon: Users,
      label: '구매 유저 CVR',
      value: formatRate(current.user_cvr),
      color: '#F59E0B',
    },
  ]

  return (
    <div className="mx-6 mb-5 flex items-center gap-6 rounded-xl border border-[#E0E7FF] bg-[#EEF2FF] px-5 py-3">
      <span className="text-xs font-semibold text-[#4361EE] whitespace-nowrap">6h Attribution</span>
      <div className="h-4 w-px bg-[#C7D2FE]" />
      {items.map((item, i) => (
        <div key={item.label} className="flex items-center gap-2">
          {i > 0 && <div className="h-4 w-px bg-[#C7D2FE]" />}
          <item.icon className="h-3.5 w-3.5 shrink-0" style={{ color: item.color }} />
          <span className="text-xs text-[#6B7280]">{item.label}</span>
          <span className="text-sm font-bold text-[#111827]">{item.value}</span>
        </div>
      ))}
    </div>
  )
}
