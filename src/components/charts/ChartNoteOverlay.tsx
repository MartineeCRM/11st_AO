import { useState, useRef, useEffect } from 'react'
import { StickyNote, X, Trash2 } from 'lucide-react'
import type { ChartNote } from '@/hooks/useChartNotes'

interface NoteMarkerProps {
  cx: number
  cy: number
  date: string
  note: ChartNote | undefined
  onSave: (date: string, text: string) => void
  onDelete: (date: string) => void
}

export function NoteMarker({ cx, cy, date, note, onSave, onDelete }: NoteMarkerProps) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
        setEditing(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  useEffect(() => {
    if (editing && textareaRef.current) textareaRef.current.focus()
  }, [editing])

  function handleClick() {
    setOpen(o => !o)
    if (!open) {
      setDraft(note?.note ?? '')
      setEditing(!note)
    }
  }

  function handleSave() {
    if (draft.trim()) {
      onSave(date, draft.trim())
    }
    setEditing(false)
    setOpen(false)
  }

  function handleDelete() {
    onDelete(date)
    setOpen(false)
    setEditing(false)
  }

  const hasNote = !!note

  return (
    <g>
      {/* 노트 마커 점 */}
      <circle
        cx={cx}
        cy={cy - 14}
        r={5}
        fill={hasNote ? '#4361EE' : '#E5E7EB'}
        stroke="white"
        strokeWidth={1.5}
        style={{ cursor: 'pointer' }}
        onClick={handleClick}
      />
      {hasNote && (
        <text
          x={cx}
          y={cy - 10}
          textAnchor="middle"
          fontSize={7}
          fill="white"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          ✎
        </text>
      )}

      {/* 팝오버 */}
      {open && (
        <foreignObject
          x={cx - 120}
          y={cy - 160}
          width={240}
          height={150}
          style={{ overflow: 'visible' }}
        >
          <div
            ref={popoverRef}
            className="rounded-xl border border-[#E5E7EB] bg-white shadow-lg p-3 text-xs"
            style={{ width: 240 }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1 text-[#374151] font-semibold">
                <StickyNote className="h-3 w-3 text-[#4361EE]" />
                {date}
              </div>
              <div className="flex items-center gap-1">
                {hasNote && !editing && (
                  <button onClick={handleDelete} className="text-[#9CA3AF] hover:text-[#EF4444]">
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-[#9CA3AF] hover:text-[#374151]">
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>

            {editing ? (
              <>
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-[#E5E7EB] px-2 py-1.5 text-xs text-[#374151] resize-none focus:border-[#4361EE] focus:outline-none"
                  placeholder="노트를 입력하세요..."
                  onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleSave() }}
                />
                <div className="mt-2 flex justify-end gap-1.5">
                  <button
                    onClick={() => { setEditing(false); if (!hasNote) setOpen(false) }}
                    className="rounded px-2 py-1 text-[11px] text-[#6B7280] hover:bg-[#F3F4F6]"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSave}
                    className="rounded bg-[#4361EE] px-2 py-1 text-[11px] font-medium text-white hover:bg-[#3451d1]"
                  >
                    저장
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[#374151] leading-relaxed whitespace-pre-wrap mb-2">{note?.note}</p>
                {note?.author_email && (
                  <p className="text-[10px] text-[#9CA3AF]">{note.author_email}</p>
                )}
                <button
                  onClick={() => { setDraft(note?.note ?? ''); setEditing(true) }}
                  className="mt-1 text-[11px] text-[#4361EE] hover:underline"
                >
                  수정
                </button>
              </>
            )}
          </div>
        </foreignObject>
      )}
    </g>
  )
}
