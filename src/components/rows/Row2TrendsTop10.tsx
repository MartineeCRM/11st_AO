import { DailySendComboChart } from '@/components/charts/DailySendComboChart'
import { Top10BarChart } from '@/components/charts/Top10BarChart'
import type { DailyComboPoint, Top10Item, Top10Metric } from '@/types/metrics'

interface Props {
  dailyCombo: DailyComboPoint[]
  top10: Top10Item[]
  top10Metric: Top10Metric
  top10Type: 'campaign' | 'canvas'
  onTop10MetricChange: (m: Top10Metric) => void
  onTop10TypeChange: (t: 'campaign' | 'canvas') => void
}

export function Row2TrendsTop10({
  dailyCombo,
  top10,
  top10Metric,
  top10Type,
  onTop10MetricChange,
  onTop10TypeChange,
}: Props) {
  return (
    <div className="flex gap-4 px-6 py-4" style={{ minHeight: 420 }}>
      <div className="flex-[53]">
        <DailySendComboChart data={dailyCombo} />
      </div>
      <div className="flex-[43]">
        <Top10BarChart
          data={top10}
          metric={top10Metric}
          type={top10Type}
          onMetricChange={onTop10MetricChange}
          onTypeChange={onTop10TypeChange}
        />
      </div>
    </div>
  )
}
