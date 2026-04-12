import { KpiCard } from '@/components/cards/KpiCard'
import type { KpiCardData } from '@/types/metrics'

interface Props {
  kpiCards: KpiCardData[]
}

export function Row1KpiSummary({ kpiCards }: Props) {
  return (
    <div className="flex gap-3 px-6 py-4">
      {kpiCards.map(card => (
        <KpiCard key={card.label} data={card} />
      ))}
    </div>
  )
}
