import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
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
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 })
  const circleRef = useRef<SVGCircleElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasNote = !!note

  const POPOVER_W = 240
  const POPOVER_H = 180

  const calcPos = useCallback(() => {
    if (!circleRef.current) return
    const rect = circleRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    // 기본: 마커 위쪽에 표시
    let top = rect.top + window.scrollY - POPOVER_H - 8
    let left = rect.left + window.scrollX - POPOVER_W / 2 + rect.width / 2

    // 뷰포트 경계 클램핑
    if (left < 8) left = 8
    if (left + POPOVER_W > vw - 8) left = vw - POPOVER_W - 8
    if (top < window.scrollY + 8) top = rect.bottom + window.scrollY + 8  // 아래로 전환

    setPopoverPos({ top, left })
  }, [])

  useEffect(() => {
    if (!open) return
    calcPos()
    window.addEventListener('scroll', calcPos, true)
    window.addEventListener('resize', calcPos)
    return () => {
      window.removeEventListener('scroll', calcPos, true)
      window.removeEventListener('resize', calcPos)
    }
  }, [open, calcPos])

  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        circleRef.current && !circleRef.current.contains(e.target as Node)
      ) {
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
    if (open) {
      setOpen(false)
      setEditing(false)
    } else {
      setDraft(note?.note ?? '')
      setEditing(!note)
      setOpen(true)
    }
  }

  function handleSave() {
    if (draft.trim()) onSave(date, draft.trim())
    setEditing(false)
    setOpen(false)
  }

  function handleDelete() {
    onDelete(date)
    setOpen(false)
    setEditing(false)
  }

  return (
    <g>
      {/* 노트 마커 점 */}
      <circle
        ref={circleRef}
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

      {/* 팝오버 — body 포탈로 SVG 클리핑 우회 */}
      {open && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[9999] rounded-xl border border-[#E5E7EB] bg-white shadow-xl p-3 text-xs"
          style={{ top: popoverPos.top, left: popoverPos.left, width: POPOVER_W }}
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
              <button onClick={() => { setOpen(false); setEditing(false) }} className="text-[#9CA3AF] hover:text-[#374151]">
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
        </div>,
        document.body,
      )}
    </g>
  )
}
