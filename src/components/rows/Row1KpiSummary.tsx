import { KpiCard } from '@/components/cards/KpiCard'
import { DraggableItemWrapper } from '@/components/DraggableItemWrapper'
import { ItemSortableRow } from '@/components/ItemSortableRow'
import type { KpiCardData } from '@/types/metrics'
import type { LayoutItem } from '@/lib/supabase'

interface Props {
  kpiCards: KpiCardData[]
  items?: LayoutItem[]
  isEditing: boolean
  onReorder: (oldIndex: number, newIndex: number) => void
  onToggleVisible: (id: string) => void
}

export function Row1KpiSummary({ kpiCards, items, isEditing, onReorder, onToggleVisible }: Props) {
  const byId = new Map(kpiCards.map(c => [c.id, c]))
  const order = items ?? kpiCards.map(c => ({ id: c.id, visible: true }))

  return (
    <ItemSortableRow
      ids={order.map(it => it.id)}
      strategy="horizontal"
      onReorder={onReorder}
      className="flex gap-3 px-6 py-4"
    >
      {order.map(it => {
        const card = byId.get(it.id)
        if (!card) return null
        return (
          <DraggableItemWrapper
            key={it.id}
            id={it.id}
            visible={it.visible}
            isEditing={isEditing}
            onToggleVisible={() => onToggleVisible(it.id)}
            className={card.primary ? 'flex-[1.6]' : 'flex-1'}
          >
            <KpiCard data={card} />
          </DraggableItemWrapper>
        )
      })}
    </ItemSortableRow>
  )
}
