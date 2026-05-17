import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Eye, EyeOff } from 'lucide-react'
import type { SectionId } from '@/lib/supabase'
import { SECTION_LABELS } from '@/hooks/useDashboardLayout'

interface Props {
  id: SectionId
  visible: boolean
  isEditing: boolean
  onToggleVisible: () => void
  children: React.ReactNode
}

export function DraggableSectionWrapper({ id, visible, isEditing, onToggleVisible, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  if (!isEditing && !visible) return null

  if (!isEditing) return <>{children}</>

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-[18px] border-2 transition-colors ${
        visible ? 'border-[#0066cc]/30' : 'border-[#e0e0e0] opacity-50'
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F9FAFB] border-b border-[#e0e0e0] rounded-t-xl">
        <button
          className="text-[#9CA3AF] hover:text-[#1d1d1f] cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>
        <span className="flex-1 text-xs font-medium text-[#1d1d1f]">
          {SECTION_LABELS[id]}
        </span>
        <button
          onClick={onToggleVisible}
          className={`rounded p-0.5 transition-colors ${
            visible
              ? 'text-[#0066cc] hover:bg-[#e8f0fb]'
              : 'text-[#9CA3AF] hover:bg-[#F3F4F6]'
          }`}
          title={visible ? '숨기기' : '표시하기'}
        >
          {visible ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
      </div>

      {visible ? (
        <div className="pointer-events-none select-none">{children}</div>
      ) : (
        <div className="h-16 flex items-center justify-center">
          <span className="text-xs text-[#9CA3AF]">숨겨진 섹션</span>
        </div>
      )}
    </div>
  )
}
