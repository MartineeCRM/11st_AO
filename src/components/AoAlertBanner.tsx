import { AlertTriangle } from 'lucide-react'
import { formatNumber, formatCurrency } from '@/lib/formatters'
import { formatDateShort } from '@/lib/formatters'
import type { AoCampaignAlert, AoCampaignAlertTrigger, AoAlertWindows } from '@/lib/metrics'
import { MONITORING_GROUPS, type MonitoringGroupId } from '@/lib/monitoringGroups'

interface Props {
  alerts: AoCampaignAlert[]
  windows: AoAlertWindows | null
  groupKeys: Record<MonitoringGroupId, string[]>
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

const BASIS_LABEL = { week: '전주', month: '전월 동기간' } as const

export function AoAlertBanner({ alerts, windows, groupKeys }: Props) {
  if (alerts.length === 0) return null
  const range = (r: { start: string; end: string }) => `${formatDateShort(r.start)}~${formatDateShort(r.end)}`

  // 담당 A/B 순서대로 묶고, 어느 쪽에도 없는 모니터링 대상은 "기타"로
  const groupOf = new Map<string, MonitoringGroupId>()
  for (const g of MONITORING_GROUPS) for (const k of groupKeys[g.id]) groupOf.set(k, g.id)
  const sections = [
    ...MONITORING_GROUPS.map(g => ({ id: g.id as string, label: g.label, items: alerts.filter(a => groupOf.get(a.campaign) === g.id) })),
    { id: 'etc', label: '기타 (담당 미지정)', items: alerts.filter(a => !groupOf.has(a.campaign)) },
  ].filter(sec => sec.items.length > 0)

  return (
    <div className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-[#B91C1C]">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        주의 필요 캠페인 {alerts.length}개
        <span className="font-normal text-[#DC2626]">(전주 · 전월 동기간 대비 30% 이상 하락)</span>
      </div>
      {windows && (
        <p className="mt-0.5 text-[10px] text-[#DC2626]">
          비교 기간 {range(windows.current)} · 전주 {range(windows.previousWeek)} · 전월 동기간 {range(windows.previousMonth)}
        </p>
      )}

      <div className="mt-2 flex flex-col gap-3">
        {sections.map(sec => (
          <section key={sec.id}>
            <p className="text-[11px] font-semibold text-[#B91C1C]">{sec.label} · {sec.items.length}개</p>
            <ul className="mt-1 flex flex-col gap-2">
              {sec.items.map(alert => (
                <li key={alert.campaign} className="text-xs text-[#7F1D1D]">
                  <div className="font-bold">{alert.campaign}</div>
                  <ul className="mt-0.5 ml-3 list-disc space-y-0.5">
                    {alert.triggers.map(trigger => {
                      const { previous, current } = formatTriggerValue(trigger)
                      return (
                        <li key={`${trigger.basis}-${trigger.metric}`}>
                          {BASIS_LABEL[trigger.basis]} 대비 {trigger.label} {Math.round(trigger.dropRate * 100)}%↓ ({previous} → {current})
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
