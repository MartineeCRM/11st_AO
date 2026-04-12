import { BusinessKpiTable } from '@/components/charts/BusinessKpiTable'
import { OptInCard } from '@/components/cards/OptInCard'
import type { BusinessKpiRow, OptInData } from '@/types/metrics'

interface Props {
  bizKpiTable: BusinessKpiRow[]
  optInData: OptInData[]
}

export function Row4TableOptIn({ bizKpiTable, optInData }: Props) {
  return (
    <div className="flex gap-4 px-6 py-4" style={{ minHeight: 360 }}>
      <div className="flex-[64]">
        <BusinessKpiTable rows={bizKpiTable} />
      </div>
      <div className="flex-[33] flex flex-col gap-3">
        {optInData.map(d => (
          <OptInCard key={d.label} data={d} />
        ))}
      </div>
    </div>
  )
}
