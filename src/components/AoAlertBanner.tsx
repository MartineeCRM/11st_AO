import { AlertTriangle } from 'lucide-react'
import { formatNumber, formatCurrency, formatDateShort } from '@/lib/formatters'
import type { AoCampaignAlert, AoAlertCell, AoAlertWindows } from '@/lib/metrics'
import { MONITORING_GROUPS, type MonitoringGroupId } from '@/lib/monitoringGroups'

interface Props {
  alerts: AoCampaignAlert[]
  windows: AoAlertWindows | null
  groupKeys: Record<MonitoringGroupId, string[]>
}

function formatCellValue(cell: AoAlertCell): { previous: string; current: string } {
  if (cell.metric === 'sent') return { previous: formatNumber(cell.previous), current: formatNumber(cell.current) }
  if (cell.metric === 'openRate') {
    return { previous: `${(cell.previous * 100).toFixed(1)}%`, current: `${(cell.current * 100).toFixed(1)}%` }
  }
  return { previous: formatCurrency(cell.previous), current: formatCurrency(cell.current) }
}

const BASIS_LABEL = { week: '전주', month: '전월 동기간' } as const

function formatDelta(delta: number): string {
  const pct = Math.round(delta * 100)
  return pct < 0 ? `${-pct}%↓` : pct > 0 ? `+${pct}%↑` : '0%'
}

export function AoAlertBanner({ alerts, windows, groupKeys }: Props) {
  if (alerts.length === 0) return null
  const sentDropCount = alerts.filter(a => a.cells.some(c => c.flagged && c.metric === 'sent')).length
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
        <span className="ml-auto rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[11px]">발송건수 하락 {sentDropCount}개</span>
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
                  <table className="mt-1 w-full max-w-2xl table-fixed border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-[#FEE2E2] text-[#B91C1C]">
                        <th className="w-24 border border-[#FCA5A5] px-2 py-1 text-left font-semibold">지표</th>
                        {(['week', 'month'] as const).map(basis => (
                          <th key={basis} className="border border-[#FCA5A5] px-2 py-1 text-left font-semibold">{BASIS_LABEL[basis]} 대비</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(['sent', 'openRate', 'grossAmount'] as const).map(metric => {
                        const row = (['week', 'month'] as const).map(basis => alert.cells.find(c => c.basis === basis && c.metric === metric)!)
                        return (
                          <tr key={metric}>
                            <td className={'border border-[#FCA5A5] px-2 py-1 ' + (metric === 'sent' ? 'font-semibold' : '')}>{row[0].label}</td>
                            {row.map(cell => {
                              if (cell.delta === null) {
                                return <td key={cell.basis} className="border border-[#FCA5A5] px-2 py-1 text-[#9CA3AF]">-</td>
                              }
                              const { previous, current } = formatCellValue(cell)
                              return (
                                <td
                                  key={cell.basis}
                                  className={'border border-[#FCA5A5] px-2 py-1 ' + (cell.flagged ? 'bg-[#FEE2E2] font-semibold text-[#B91C1C]' : 'bg-white/60 text-[#6B7280]')}
                                >
                                  {formatDelta(cell.delta)} ({previous} → {current})
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
