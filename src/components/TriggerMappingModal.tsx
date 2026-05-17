import { useState } from 'react'
import { X } from 'lucide-react'
import type { EnrichedCampaign } from '@/hooks/useBrazeCampaigns'
import { channelLabel, channelBadgeColor } from '@/lib/braze'

interface Props {
  campaigns: EnrichedCampaign[]
  existingTriggers: string[]
  savedMappings: Record<string, string>
  onSave: (mappings: Record<string, string>) => Promise<void>
  onClose: () => void
}

export function TriggerMappingModal({ campaigns, existingTriggers, savedMappings, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<Record<string, string>>(() => ({ ...savedMappings }))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function setMapping(campaignId: string, value: string) {
    setDraft(prev => ({ ...prev, [campaignId]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const cleaned = Object.fromEntries(
      Object.entries(draft).filter(([, v]) => v.trim() !== '')
    )
    try {
      await onSave(cleaned)
      onClose()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-[18px] shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e0e0e0]">
          <div>
            <h2 className="text-sm font-semibold text-[#1d1d1f]">트리거 이름 수동 매핑</h2>
            <p className="text-xs text-[#9CA3AF] mt-0.5">미매핑 캠페인에 트리거 이름을 지정합니다.</p>
          </div>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#1d1d1f] p-1 rounded">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#F3F4F6]">
          {campaigns.length === 0 && (
            <p className="py-10 text-center text-sm text-[#9CA3AF]">미매핑 캠페인이 없습니다.</p>
          )}
          {campaigns.map(c => {
            const ch = c.channels[0] ?? 'unknown'
            const badge = channelBadgeColor(ch)
            return (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ background: badge.bg, color: badge.text }}
                >
                  {channelLabel(ch)}
                </span>
                <span className="flex-1 text-xs text-[#1d1d1f] truncate" title={c.name}>{c.name}</span>
                <div className="relative shrink-0 w-36">
                  <input
                    type="text"
                    list={`triggers-${c.id}`}
                    value={draft[c.id] ?? ''}
                    onChange={e => setMapping(c.id, e.target.value)}
                    placeholder="트리거 이름 입력..."
                    className="w-full rounded-lg border border-[#e0e0e0] px-2.5 py-1.5 text-xs text-[#1d1d1f] focus:border-[#0066cc] focus:outline-none"
                  />
                  <datalist id={`triggers-${c.id}`}>
                    {existingTriggers.map(t => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-[#e0e0e0] bg-[#F9FAFB]">
          {saveError ? (
            <span className="text-xs text-[#EF4444]">{saveError}</span>
          ) : (
            <span className="text-xs text-[#9CA3AF]">입력하지 않은 항목은 저장되지 않습니다.</span>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-xs text-[#6B7280] hover:bg-[#F3F4F6]"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-[#1d1d1f] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1d1d1f] disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
