import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { StickyNote, X, Trash2, Pencil, Plus } from 'lucide-react'
import type { ChartNote } from '@/hooks/useChartNotes'

interface NoteMarkerProps {
  cx: number
  cy: number
  date: string
  note: ChartNote | undefined
  onSave: (date: string, text: string) => void
  onDelete: (date: string) => void
}

const POPOVER_W = 260
const LINE_TOP = 16    // annotation line starts near chart top (within margin.top)
const MARKER_R = 5

export function NoteMarker({ cx, cy, date, note, onSave, onDelete }: NoteMarkerProps) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [draft, setDraft] = useState('')
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 })
  const markerRef = useRef<SVGCircleElement>(null)
  const addBtnRef = useRef<SVGCircleElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const hasNote = !!note

  const calcPos = useCallback((targetRef: React.RefObject<SVGCircleElement | null>) => {
    const el = targetRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const POPOVER_H = 160 // approximate popover height

    let left = rect.left + window.scrollX - POPOVER_W / 2 + rect.width / 2
    // prefer above the marker; if not enough room, show below
    let top = rect.top + window.scrollY - POPOVER_H - 8
    if (top < window.scrollY + 8) top = rect.bottom + window.scrollY + 8

    if (left < 8) left = 8
    if (left + POPOVER_W > vw - 8) left = vw - POPOVER_W - 8

    setPopoverPos({ top, left })
  }, [])

  useEffect(() => {
    if (!open) return
    const ref = hasNote ? markerRef : addBtnRef
    calcPos(ref)
    const handler = () => calcPos(ref)
    window.addEventListener('scroll', handler, true)
    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('scroll', handler, true)
      window.removeEventListener('resize', handler)
    }
  }, [open, hasNote, calcPos])

  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      const clickedMarker = markerRef.current?.contains(e.target as Node)
      const clickedAdd = addBtnRef.current?.contains(e.target as Node)
      const clickedPopover = popoverRef.current?.contains(e.target as Node)
      if (!clickedMarker && !clickedAdd && !clickedPopover) {
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

  function openNew() {
    setDraft('')
    setEditing(true)
    setOpen(true)
  }

  function openExisting() {
    if (open) { setOpen(false); setEditing(false) }
    else { setDraft(note?.note ?? ''); setEditing(false); setOpen(true) }
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
      {/* ── 노트 있는 날짜: Amplitude 스타일 세로선 + 마커 ── */}
      {hasNote && (
        <>
          {/* 연한 점선 세로선 */}
          <line
            x1={cx} y1={LINE_TOP}
            x2={cx} y2={cy}
            stroke="#9CA3AF"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.7}
            style={{ pointerEvents: 'none' }}
          />
          {/* 상단 마커 */}
          <circle
            ref={markerRef}
            cx={cx}
            cy={LINE_TOP}
            r={MARKER_R}
            fill={open ? '#374151' : '#6B7280'}
            stroke="white"
            strokeWidth={1.5}
            style={{ cursor: 'pointer' }}
            onClick={openExisting}
          />
          <text
            x={cx} y={LINE_TOP + 3.5}
            textAnchor="middle"
            fontSize={6}
            fill="white"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            ✎
          </text>
        </>
      )}

      {/* ── 노트 없는 날짜: 데이터 포인트 위 호버 시 + 버튼 ── */}
      {!hasNote && (
        <>
          {/* 투명 히트 영역 */}
          <circle
            cx={cx} cy={cy}
            r={8}
            fill="transparent"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            onClick={openNew}
          />
          {hovering && (
            <>
              <circle
                ref={addBtnRef}
                cx={cx} cy={cy - 14}
                r={MARKER_R}
                fill="#D1D5DB"
                stroke="white"
                strokeWidth={1.5}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHovering(true)}
                onMouseLeave={() => setHovering(false)}
                onClick={openNew}
              />
              <text
                x={cx} y={cy - 10.5}
                textAnchor="middle"
                fontSize={8}
                fill="white"
                fontWeight="bold"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                +
              </text>
            </>
          )}
        </>
      )}

      {/* ── 팝오버 ── */}
      {open && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[9999] rounded-xl border border-[#E5E7EB] bg-white shadow-xl text-xs overflow-hidden"
          style={{ top: popoverPos.top, left: popoverPos.left, width: POPOVER_W }}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#F3F4F6] bg-[#F9FAFB]">
            <div className="flex items-center gap-1.5 font-semibold text-[#374151]">
              <StickyNote className="h-3 w-3 text-[#6B7280]" />
              <span className="text-[11px]">{date}</span>
            </div>
            <div className="flex items-center gap-1">
              {hasNote && !editing && (
                <button
                  onClick={() => { setDraft(note?.note ?? ''); setEditing(true) }}
                  className="rounded p-0.5 text-[#9CA3AF] hover:text-[#374151] hover:bg-[#E5E7EB]"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
              {hasNote && !editing && (
                <button onClick={handleDelete} className="rounded p-0.5 text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#FEE2E2]">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
              <button
                onClick={() => { setOpen(false); setEditing(false) }}
                className="rounded p-0.5 text-[#9CA3AF] hover:text-[#374151] hover:bg-[#E5E7EB]"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* 본문 */}
          <div className="px-3 py-2.5">
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
                    className="rounded bg-[#374151] px-2 py-1 text-[11px] font-medium text-white hover:bg-[#111827]"
                  >
                    저장
                  </button>
                </div>
              </>
            ) : (
              <p className="text-[#374151] leading-relaxed whitespace-pre-wrap text-[11px]">
                {note?.note}
                {note?.author_email && (
                  <span className="block mt-1.5 text-[10px] text-[#9CA3AF]">{note.author_email}</span>
                )}
              </p>
            )}
          </div>
        </div>,
        document.body,
      )}
    </g>
  )
}
