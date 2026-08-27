import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  id: string
  visible: boolean
  isEditing: boolean
  onToggleVisible: () => void
  className?: string
  children: React.ReactNode
}

export function DraggableItemWrapper({ id, visible, isEditing, onToggleVisible, className, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  if (!isEditing) {
    if (!visible) return null
    return <>{children}</>
  }

  if (!visible) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'pointer-events-auto flex min-h-[80px] items-center justify-center rounded-[18px] border-2 border-dashed border-[#e0e0e0] bg-[#F9FAFB]',
          className,
        )}
      >
        <button
          onClick={onToggleVisible}
          className="flex items-center gap-1 rounded p-1 text-[10px] text-[#9CA3AF] hover:bg-[#F3F4F6]"
        >
          <EyeOff size={12} />
          숨김
        </button>
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style} className={cn('relative min-w-0', className)}>
      <div className="pointer-events-auto absolute -top-2 -right-2 z-10 flex items-center gap-0.5 rounded-full border border-[#e0e0e0] bg-white px-1 py-0.5 shadow-sm">
        <button
          className="cursor-grab p-0.5 text-[#9CA3AF] hover:text-[#1d1d1f] active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={12} />
        </button>
        <button
          onClick={onToggleVisible}
          className="rounded p-0.5 text-[#0066cc] hover:bg-[#e8f0fb]"
        >
          <Eye size={12} />
        </button>
      </div>
      {children}
    </div>
  )
}
