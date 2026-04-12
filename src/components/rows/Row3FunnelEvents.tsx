import { ConversionFunnel } from '@/components/charts/ConversionFunnel'
import { CustomEventLineChart } from '@/components/charts/CustomEventLineChart'
import type { FunnelStep } from '@/types/metrics'
import type { FunnelFieldKey } from '@/lib/metrics'
import type { DailyKpiRow } from '@/types/sheets'

interface Props {
  funnel: FunnelStep[]
  funnelSteps: FunnelFieldKey[]
  onFunnelStepsChange: (steps: FunnelFieldKey[]) => void
  kpiRows: DailyKpiRow[]
}

export function Row3FunnelEvents({ funnel, funnelSteps, onFunnelStepsChange, kpiRows }: Props) {
  return (
    <div className="flex gap-4 px-6 py-4" style={{ minHeight: 380 }}>
      <div className="flex-[35]">
        <ConversionFunnel data={funnel} steps={funnelSteps} onStepsChange={onFunnelStepsChange} />
      </div>
      <div className="flex-[61]">
        <CustomEventLineChart kpiRows={kpiRows} />
      </div>
    </div>
  )
}
