import { useState, useRef, useEffect } from 'react'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import { useSectionNotes, type SectionId } from '@/hooks/useSectionNotes'

interface Props {
  sectionId: SectionId
  title: string
  titleClassName?: string
}

export function ChartSectionNote({ sectionId, title, titleClassName = 'text-sm font-semibold text-[#111827]' }: Props) {
  const { note, saveNote, deleteNote } = useSectionNotes(sectionId)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [hovering, setHovering] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing && textareaRef.current) textareaRef.current.focus()
  }, [editing])

  function startEdit() {
    setDraft(note?.note ?? '')
    setEditing(true)
  }

  async function handleSave() {
    if (draft.trim()) {
      await saveNote(draft.trim())
    } else {
      await deleteNote()
    }
    setEditing(false)
  }

  function handleCancel() {
    setEditing(false)
  }

  return (
    <div className="flex flex-col gap-1">
      {/* 제목 행 */}
      <div
        className="flex items-center gap-1.5"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <span className={titleClassName}>{title}</span>
        {(hovering || editing) && (
          <button
            onClick={startEdit}
            className="rounded p-0.5 text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F3F4F6] transition-colors"
            title="노트 편집"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
        {note && !editing && (hovering) && (
          <button
            onClick={deleteNote}
            className="rounded p-0.5 text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#FEE2E2] transition-colors"
            title="노트 삭제"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* 노트 표시 (편집 모드 아닐 때) */}
      {note && !editing && (
        <p className="text-[11px] text-[#6B7280] leading-relaxed whitespace-pre-wrap">
          {note.note}
        </p>
      )}

      {/* 편집 모드 */}
      {editing && (
        <div className="flex flex-col gap-1.5">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={2}
            placeholder="차트에 대한 설명을 입력하세요..."
            className="w-full rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-[11px] text-[#374151] resize-none focus:border-[#4361EE] focus:outline-none"
            onKeyDown={e => {
              if (e.key === 'Enter' && e.metaKey) handleSave()
              if (e.key === 'Escape') handleCancel()
            }}
          />
          <div className="flex items-center gap-1">
            <button
              onClick={handleSave}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] bg-[#374151] text-white hover:bg-[#111827] transition-colors"
            >
              <Check className="h-3 w-3" />
              저장
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
            >
              <X className="h-3 w-3" />
              취소
            </button>
            <span className="text-[10px] text-[#9CA3AF] ml-1">⌘↵ 저장</span>
          </div>
        </div>
      )}
    </div>
  )
}
