import { MetricToggleGroup } from './MetricToggleGroup'
import { EventTrendChart } from './AttributionTrendChart'
import { formatKorean } from '@/lib/formatters'
import type { EventTrendPoint } from '@/hooks/useAttributionMetrics'
import { ChartSectionNote } from '@/components/charts/ChartSectionNote'

function formatAdaptiveRate(v: number): string {
  const pct = v * 100
  if (pct === 0) return '0.00%'
  const decimals = pct < 0.001 ? 6 : pct < 0.01 ? 5 : pct < 0.1 ? 4 : pct < 1 ? 3 : 2
  return `${pct.toFixed(decimals)}%`
}

interface Props {
  activeEvent: string
  onEventChange: (key: string) => void
  eventCvr: number
  eventRawCount: number
  eventImpression: number
  eventTrend: EventTrendPoint[]
  availableEvents: string[]
}

export function EventMetricsSection({
  activeEvent,
  onEventChange,
  eventCvr,
  eventRawCount,
  eventImpression,
  eventTrend,
  availableEvents,
}: Props) {
  const options = availableEvents.map(k => ({ key: k, label: k }))

  if (options.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-[#9CA3AF]">
        기타 이벤트 데이터가 없습니다.
      </div>
    )
  }

  const activeLabel = activeEvent

  return (
    <div className="flex flex-col gap-4">
      <MetricToggleGroup
        options={options}
        active={activeEvent}
        onChange={onEventChange}
      />

      <div className="rounded-xl border border-[#e0e0e0] bg-white p-4">
        <div className="mb-3">
          <ChartSectionNote sectionId="att_event_trend" title={`${activeLabel} 발생수 트렌드`} titleClassName="text-xs font-semibold text-[#1d1d1f]" />
        </div>
        <EventTrendChart data={eventTrend} eventLabel={activeLabel} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#e0e0e0] bg-white px-4 py-3">
          <p className="text-[11px] text-[#9CA3AF]">{activeLabel} CVR</p>
          <p className="text-xl font-bold text-[#1d1d1f]">{formatAdaptiveRate(eventCvr)}</p>
          <p className="mt-0.5 text-[10px] text-[#9CA3AF]">이벤트 수 ÷ 노출+발송 유저</p>
        </div>
        <div className="rounded-xl border border-[#e0e0e0] bg-white px-4 py-3">
          <p className="text-[11px] text-[#9CA3AF]">{activeLabel} 발생수</p>
          <p className="text-xl font-bold text-[#1d1d1f]">{formatKorean(eventRawCount)}</p>
          <p className="mt-0.5 text-[10px] text-[#9CA3AF]">기간 내 이벤트 합계</p>
        </div>
        <div className="rounded-xl border border-[#e0e0e0] bg-white px-4 py-3">
          <p className="text-[11px] text-[#9CA3AF]">노출+발송 유저</p>
          <p className="text-xl font-bold text-[#1d1d1f]">{formatKorean(eventImpression)}</p>
          <p className="mt-0.5 text-[10px] text-[#9CA3AF]">IMPRESSION_OR_SEND_USER</p>
        </div>
      </div>
    </div>
  )
}
