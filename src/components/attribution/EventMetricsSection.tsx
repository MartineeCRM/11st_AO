import { MetricToggleGroup } from './MetricToggleGroup'
import { EventTrendChart } from './AttributionTrendChart'
import { formatKorean } from '@/lib/formatters'
import type { EventKey, EventTrendPoint } from '@/hooks/useAttributionMetrics'

function formatAdaptiveRate(v: number): string {
  const pct = v * 100
  if (pct === 0) return '0.00%'
  const decimals = pct < 0.001 ? 6 : pct < 0.01 ? 5 : pct < 0.1 ? 4 : pct < 1 ? 3 : 2
  return `${pct.toFixed(decimals)}%`
}

const EVENT_OPTIONS: { key: EventKey; label: string }[] = [
  { key: 'join_membership', label: '회원가입' },
  { key: 'add_to_cart', label: '장바구니' },
  { key: 'pdp_view', label: '상세페이지' },
  { key: 'exhibition_view', label: '기획전' },
  { key: 'push_subscribe', label: 'Push 동의' },
  { key: 'coupon_used', label: '쿠폰사용' },
  { key: 'promo_event_complete', label: '이벤트참여' },
  { key: 'promo_page_view', label: '이벤트페이지뷰' },
  { key: 'plus_subscribe_start', label: '11번가+ 구독' },
  { key: 'family_member_join', label: '패밀리가입' },
  { key: 'family_order_complete', label: '패밀리주문완료' },
  { key: 'family_order_request', label: '패밀리주문요청' },
  { key: 'family_order_request_received', label: '패밀리주문수신' },
  { key: 'lotto_issued', label: '십일또발행' },
  { key: 'lotto_my_page_view', label: '십일또페이지' },
  { key: 'lotto_attendance_check', label: '십일또출첵' },
  { key: 'noti_setting_view', label: '알람설정조회' },
  { key: 'my_11st_view', label: '마이페이지' },
]

interface Props {
  activeEvent: EventKey
  onEventChange: (key: EventKey) => void
  eventCvr: number
  eventRawCount: number
  eventImpression: number
  eventTrend: EventTrendPoint[]
}

export function EventMetricsSection({
  activeEvent,
  onEventChange,
  eventCvr,
  eventRawCount,
  eventImpression,
  eventTrend,
}: Props) {
  const activeLabel = EVENT_OPTIONS.find(o => o.key === activeEvent)?.label ?? activeEvent

  return (
    <div className="flex flex-col gap-4">
      <MetricToggleGroup
        options={EVENT_OPTIONS}
        active={activeEvent}
        onChange={onEventChange}
      />

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
        <p className="mb-3 text-xs font-semibold text-[#374151]">
          {activeLabel} 발생수 트렌드
        </p>
        <EventTrendChart data={eventTrend} eventLabel={activeLabel} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3">
          <p className="text-[11px] text-[#9CA3AF]">{activeLabel} CVR</p>
          <p className="text-xl font-bold text-[#111827]">{formatAdaptiveRate(eventCvr)}</p>
          <p className="mt-0.5 text-[10px] text-[#9CA3AF]">이벤트 수 ÷ 노출+발송 유저</p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3">
          <p className="text-[11px] text-[#9CA3AF]">{activeLabel} 발생수</p>
          <p className="text-xl font-bold text-[#111827]">{formatKorean(eventRawCount)}</p>
          <p className="mt-0.5 text-[10px] text-[#9CA3AF]">기간 내 이벤트 합계</p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3">
          <p className="text-[11px] text-[#9CA3AF]">노출+발송 유저</p>
          <p className="text-xl font-bold text-[#111827]">{formatKorean(eventImpression)}</p>
          <p className="mt-0.5 text-[10px] text-[#9CA3AF]">IMPRESSION_OR_SEND_USER</p>
        </div>
      </div>
    </div>
  )
}
