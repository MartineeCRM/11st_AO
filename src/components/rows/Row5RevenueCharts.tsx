import { AovRevenueComboChart } from '@/components/charts/AovRevenueComboChart'
import { RevenueRewardComboChart } from '@/components/charts/RevenueRewardComboChart'
import type { DailyRevenuePoint } from '@/types/metrics'

interface Props {
  dailyRevenue: DailyRevenuePoint[]
}

export function Row5RevenueCharts({ dailyRevenue }: Props) {
  return (
    <div className="flex gap-4 px-6 py-4" style={{ minHeight: 320 }}>
      <div className="flex-1">
        <AovRevenueComboChart data={dailyRevenue} />
      </div>
      <div className="flex-1">
        <RevenueRewardComboChart data={dailyRevenue} />
      </div>
    </div>
  )
}
