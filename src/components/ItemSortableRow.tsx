import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable'

type Strategy = 'horizontal' | 'vertical' | 'grid'

const STRATEGIES = {
  horizontal: horizontalListSortingStrategy,
  vertical: verticalListSortingStrategy,
  grid: rectSortingStrategy,
}

interface Props {
  ids: string[]
  strategy: Strategy
  onReorder: (oldIndex: number, newIndex: number) => void
  className?: string
  children: React.ReactNode
}

export function ItemSortableRow({ ids, strategy, onReorder, className, children }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return
    onReorder(oldIndex, newIndex)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={STRATEGIES[strategy]}>
        <div className={className}>{children}</div>
      </SortableContext>
    </DndContext>
  )
}
