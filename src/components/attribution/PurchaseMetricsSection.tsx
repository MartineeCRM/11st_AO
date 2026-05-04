import { MetricToggleGroup } from './MetricToggleGroup'
import { PurchaseTrendChart } from './AttributionTrendChart'
import { AttributionKpiCard } from './AttributionKpiCard'
import { PurchaseDataTable } from './PurchaseDataTable'
import { CampaignRoiTable } from './CampaignRoiTable'
import { formatNumber, formatRate, formatCurrency } from '@/lib/formatters'
import type { PurchaseMetricKey, PurchaseMetrics, KpiDelta, TrendPoint } from '@/hooks/useAttributionMetrics'
import type { AttDataRow } from '@/types/sheets'

const PURCHASE_METRIC_OPTIONS: { key: PurchaseMetricKey; label: string }[] = [
  { key: 'user_cvr', label: 'CVR' },
  { key: 'purchase_count', label: 'Purchase' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'aov', label: 'AOV' },
  { key: 'arppu', label: 'ARPPU' },
  { key: 'frequency', label: 'Frequency' },
  { key: 'items_per_order', label: '주문당 제품수' },
  { key: 'items_per_user', label: '유저당 제품주문수' },
]

function formatMetricValue(key: PurchaseMetricKey, value: number): string {
  switch (key) {
    case 'user_cvr':
    case 'count_cvr':
      return formatRate(value)
    case 'revenue':
      return formatNumber(value)
    case 'aov':
    case 'arppu':
      return formatCurrency(value)
    case 'frequency':
    case 'items_per_order':
    case 'items_per_user':
      return value.toFixed(2)
    case 'purchase_count':
      return formatNumber(value)
    default:
      return formatNumber(value)
  }
}

function getYLabel(key: PurchaseMetricKey): string {
  switch (key) {
    case 'user_cvr': return 'CVR (%)'
    case 'purchase_count': return '구매수'
    case 'revenue': return '매출'
    case 'aov': return 'AOV'
    case 'arppu': return 'ARPPU'
    case 'frequency': return 'Frequency'
    case 'items_per_order': return '주문당제품'
    case 'items_per_user': return '유저당제품'
    default: return ''
  }
}

interface Props {
  activeMetric: PurchaseMetricKey
  onMetricChange: (key: PurchaseMetricKey) => void
  trendData: TrendPoint[]
  current: PurchaseMetrics
  delta: Record<PurchaseMetricKey, KpiDelta>
  filteredRows: AttDataRow[]
}

export function PurchaseMetricsSection({
  activeMetric,
  onMetricChange,
  trendData,
  current,
  delta,
  filteredRows,
}: Props) {
  const formatter = (v: number) => formatMetricValue(activeMetric, v)

  return (
    <div className="flex flex-col gap-4">
      <MetricToggleGroup
        options={PURCHASE_METRIC_OPTIONS}
        active={activeMetric}
        onChange={onMetricChange}
      />

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
        <p className="mb-3 text-xs font-semibold text-[#374151]">트렌드 (현재 / WoW / MoM)</p>
        <PurchaseTrendChart
          data={trendData}
          yLabel={getYLabel(activeMetric)}
          formatter={formatter}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {/* CVR 카드: 유저CVR + 건수CVR 병기 */}
        <AttributionKpiCard
          title="CVR"
          value={formatRate(current.user_cvr)}
          subValue={formatRate(current.count_cvr)}
          subLabel="건수 CVR"
          delta={delta.user_cvr}
          highlighted={activeMetric === 'user_cvr'}
        />
        <AttributionKpiCard
          title="Purchase"
          value={formatNumber(current.purchase_count)}
          delta={delta.purchase_count}
          highlighted={activeMetric === 'purchase_count'}
        />
        <AttributionKpiCard
          title="Revenue"
          value={formatNumber(current.revenue)}
          delta={delta.revenue}
          highlighted={activeMetric === 'revenue'}
        />
        <AttributionKpiCard
          title="AOV"
          value={formatCurrency(current.aov)}
          delta={delta.aov}
          highlighted={activeMetric === 'aov'}
        />
        <AttributionKpiCard
          title="ARPPU"
          value={formatCurrency(current.arppu)}
          delta={delta.arppu}
          highlighted={activeMetric === 'arppu'}
        />
        <AttributionKpiCard
          title="Frequency"
          value={current.frequency.toFixed(2)}
          delta={delta.frequency}
          highlighted={activeMetric === 'frequency'}
        />
        <AttributionKpiCard
          title="주문당 제품수"
          value={current.items_per_order.toFixed(2)}
          delta={delta.items_per_order}
          highlighted={activeMetric === 'items_per_order'}
        />
        <AttributionKpiCard
          title="유저당 제품주문수"
          value={current.items_per_user.toFixed(2)}
          delta={delta.items_per_user}
          highlighted={activeMetric === 'items_per_user'}
        />
      </div>

      <PurchaseDataTable rows={filteredRows} />
      <CampaignRoiTable rows={filteredRows} />
    </div>
  )
}
