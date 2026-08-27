import { BusinessKpiTable } from '@/components/charts/BusinessKpiTable'
import { OptInCard } from '@/components/cards/OptInCard'
import { DraggableItemWrapper } from '@/components/DraggableItemWrapper'
import { ItemSortableRow } from '@/components/ItemSortableRow'
import type { BusinessKpiRow, OptInData } from '@/types/metrics'
import type { LayoutItem } from '@/lib/supabase'

interface Props {
  bizKpiTable: BusinessKpiRow[]
  optInData: OptInData[]
  items?: LayoutItem[]
  isEditing: boolean
  onReorder: (oldIndex: number, newIndex: number) => void
  onToggleVisible: (id: string) => void
}

export function Row4TableOptIn({ bizKpiTable, optInData, items, isEditing, onReorder, onToggleVisible }: Props) {
  const byId = new Map(optInData.map(d => [d.id, d]))
  const order = items ?? optInData.map(d => ({ id: d.id, visible: true }))

  return (
    <div className="flex gap-4 px-6 py-4" style={{ minHeight: 360 }}>
      <div className="flex-[64]">
        <BusinessKpiTable rows={bizKpiTable} />
      </div>
      <ItemSortableRow
        ids={order.map(it => it.id)}
        strategy="vertical"
        onReorder={onReorder}
        className="flex-[33] flex flex-col gap-3"
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
            >
              <OptInCard data={card} />
            </DraggableItemWrapper>
          )
        })}
      </ItemSortableRow>
    </div>
  )
}
