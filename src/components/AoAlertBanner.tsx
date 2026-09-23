import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber, formatCurrency } from '@/lib/formatters'
import type { AoCampaignAlert, AoCampaignAlertTrigger } from '@/lib/metrics'

interface Props {
  alerts: AoCampaignAlert[]
}

function formatTriggerValue(trigger: AoCampaignAlertTrigger): { previous: string; current: string } {
  if (trigger.metric === 'sent') {
    return { previous: formatNumber(trigger.previous), current: formatNumber(trigger.current) }
  }
  if (trigger.metric === 'openRate') {
    return { previous: `${(trigger.previous * 100).toFixed(1)}%`, current: `${(trigger.current * 100).toFixed(1)}%` }
  }
  return { previous: formatCurrency(trigger.previous), current: formatCurrency(trigger.current) }
}

export function AoAlertBanner({ alerts }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (alerts.length === 0) return null

  const visible = expanded ? alerts : alerts.slice(0, 3)
  const hiddenCount = alerts.length - visible.length

  return (
    <div className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-[#B91C1C]">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        주의가 필요한 캠페인 {alerts.length}개
        <span className="font-normal text-[#DC2626]">(전주 대비 50% 이상 하락)</span>
      </div>

      <ul className="mt-2 flex flex-col gap-1.5">
        {visible.map(alert => (
          <li key={alert.campaign} className="text-xs text-[#7F1D1D]">
            <span className="font-medium">{alert.campaign}</span>
            {' — '}
            {alert.triggers.map((trigger, i) => {
              const { previous, current } = formatTriggerValue(trigger)
              return (
                <span key={trigger.metric}>
                  {i > 0 && ', '}
                  {trigger.label} {Math.round(trigger.dropRate * 100)}%↓ ({previous} → {current})
                </span>
              )
            })}
          </li>
        ))}
      </ul>

      {alerts.length > 3 && (
        <button
          onClick={() => setExpanded(v => !v)}
          className={cn(
            'mt-2 flex items-center gap-1 text-[11px] font-medium text-[#B91C1C] hover:underline',
          )}
        >
          {expanded ? (
            <>접기 <ChevronUp className="h-3 w-3" /></>
          ) : (
            <>나머지 {hiddenCount}개 더 보기 <ChevronDown className="h-3 w-3" /></>
          )}
        </button>
      )}
    </div>
  )
}
