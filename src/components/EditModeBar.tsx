import { Settings2 } from 'lucide-react'

interface Props {
  onSave: () => void
  onCancel: () => void
  saving: boolean
  saveError: string | null
}

export function EditModeBar({ onSave, onCancel, saving, saveError }: Props) {
  return (
    <div className="sticky top-14 z-40 flex items-center gap-3 px-6 py-2.5 bg-[#0066cc] shadow-md">
      <Settings2 className="h-4 w-4 text-white opacity-80" />
      <span className="text-sm font-semibold text-white flex-1">레이아웃 편집 중</span>
      {saveError && (
        <span className="text-xs text-red-200 mr-2">{saveError}</span>
      )}
      <button
        onClick={onCancel}
        className="rounded-lg px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10"
      >
        취소
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#0066cc] hover:bg-blue-50 disabled:opacity-50"
      >
        {saving ? '저장 중...' : '저장'}
      </button>
    </div>
  )
}
