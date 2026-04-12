import { DailySendComboChart } from '@/components/charts/DailySendComboChart'
import { Top10BarChart } from '@/components/charts/Top10BarChart'
import type { DailyComboPoint, Top10Item, Top10Metric } from '@/types/metrics'

interface Props {
  dailyCombo: DailyComboPoint[]
  top10: Top10Item[]
  top10Metric: Top10Metric
  onTop10MetricChange: (m: Top10Metric) => void
}

export function Row2TrendsTop10({
  dailyCombo,
  top10,
  top10Metric,
  onTop10MetricChange,
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
          onMetricChange={onTop10MetricChange}
        />
      </div>
    </div>
  )
}
