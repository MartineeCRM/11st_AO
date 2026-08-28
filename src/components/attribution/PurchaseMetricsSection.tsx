import { MetricToggleGroup } from './MetricToggleGroup'
import { PurchaseTrendChart } from './AttributionTrendChart'
import { AttributionKpiCard } from './AttributionKpiCard'
import { PurchaseDataTable } from './PurchaseDataTable'
import { CampaignRoiTable } from './CampaignRoiTable'
import { DraggableItemWrapper } from '@/components/DraggableItemWrapper'
import { ItemSortableRow } from '@/components/ItemSortableRow'
import { formatKorean, formatRate, formatRateWithCount, formatCurrency } from '@/lib/formatters'
import type { PurchaseMetricKey, PurchaseMetrics, KpiDelta, TrendPoint } from '@/hooks/useAttributionMetrics'
import type { AttDataRow } from '@/types/sheets'
import type { LayoutItem } from '@/lib/supabase'
import { ChartSectionNote } from '@/components/charts/ChartSectionNote'

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
      return formatKorean(value)
    case 'aov':
    case 'arppu':
      return formatCurrency(value)
    case 'frequency':
    case 'items_per_order':
    case 'items_per_user':
      return value.toFixed(2)
    case 'purchase_count':
      return formatKorean(value)
    default:
      return formatKorean(value)
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
  allRows?: AttDataRow[]
  items?: LayoutItem[]
  isEditing: boolean
  onReorder: (oldIndex: number, newIndex: number) => void
  onToggleVisible: (id: string) => void
}

export function PurchaseMetricsSection({
  activeMetric,
  onMetricChange,
  trendData,
  current,
  delta,
  filteredRows,
  allRows,
  items,
  isEditing,
  onReorder,
  onToggleVisible,
}: Props) {
  const formatter = (v: number) => formatMetricValue(activeMetric, v)

  const cardContent: Record<PurchaseMetricKey, React.ReactNode> = {
    user_cvr: (
      <AttributionKpiCard
        title="CVR"
        value={formatRateWithCount(current.user_cvr, current.purchase_user_count)}
        subValue={formatRateWithCount(current.count_cvr, current.purchase_count)}
        subLabel="건수 CVR"
        delta={delta.user_cvr}
        highlighted={activeMetric === 'user_cvr'}
      />
    ),
    count_cvr: null, // count_cvr은 독립 카드가 아니라 user_cvr 카드의 subValue로만 표시됨
    purchase_user_count: null, // 독립 카드 없음 — user_cvr 카드의 값 옆 카운트로만 쓰임
    purchase_count: (
      <AttributionKpiCard
        title="Purchase"
        value={formatKorean(current.purchase_count)}
        delta={delta.purchase_count}
        highlighted={activeMetric === 'purchase_count'}
      />
    ),
    revenue: (
      <AttributionKpiCard
        title="Revenue"
        value={formatKorean(current.revenue)}
        delta={delta.revenue}
        highlighted={activeMetric === 'revenue'}
      />
    ),
    aov: (
      <AttributionKpiCard
        title="AOV"
        value={formatCurrency(current.aov)}
        delta={delta.aov}
        highlighted={activeMetric === 'aov'}
      />
    ),
    arppu: (
      <AttributionKpiCard
        title="ARPPU"
        value={formatCurrency(current.arppu)}
        delta={delta.arppu}
        highlighted={activeMetric === 'arppu'}
      />
    ),
    frequency: (
      <AttributionKpiCard
        title="Frequency"
        value={current.frequency.toFixed(2)}
        delta={delta.frequency}
        highlighted={activeMetric === 'frequency'}
      />
    ),
    items_per_order: (
      <AttributionKpiCard
        title="주문당 제품수"
        value={current.items_per_order.toFixed(2)}
        delta={delta.items_per_order}
        highlighted={activeMetric === 'items_per_order'}
      />
    ),
    items_per_user: (
      <AttributionKpiCard
        title="유저당 제품주문수"
        value={current.items_per_user.toFixed(2)}
        delta={delta.items_per_user}
        highlighted={activeMetric === 'items_per_user'}
      />
    ),
  }

  const order = items ?? PURCHASE_METRIC_OPTIONS.map(o => ({ id: o.key, visible: true }))

  return (
    <div className="flex flex-col gap-4">
      <MetricToggleGroup
        options={PURCHASE_METRIC_OPTIONS}
        active={activeMetric}
        onChange={onMetricChange}
      />

      <div className="rounded-xl border border-[#e0e0e0] bg-white p-4">
        <div className="mb-3">
          <ChartSectionNote sectionId="att_purchase_trend" title="트렌드 (현재 / WoW / MoM)" titleClassName="text-xs font-semibold text-[#1d1d1f]" />
        </div>
        <PurchaseTrendChart
          data={trendData}
          yLabel={getYLabel(activeMetric)}
          formatter={formatter}
        />
      </div>

      <ItemSortableRow
        ids={order.map(it => it.id)}
        strategy="grid"
        onReorder={onReorder}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      >
        {order.map(it => {
          const content = cardContent[it.id as PurchaseMetricKey]
          if (!content) return null
          return (
            <DraggableItemWrapper
              key={it.id}
              id={it.id}
              visible={it.visible}
              isEditing={isEditing}
              onToggleVisible={() => onToggleVisible(it.id)}
            >
              {content}
            </DraggableItemWrapper>
          )
        })}
      </ItemSortableRow>

      <PurchaseDataTable rows={filteredRows} allRows={allRows} />
      <CampaignRoiTable rows={filteredRows} />
    </div>
  )
}
