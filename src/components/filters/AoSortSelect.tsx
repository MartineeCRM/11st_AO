import { AO_SORT_OPTIONS, type AoSortKey } from '@/lib/metrics'

interface Props {
  value: AoSortKey
  onChange: (key: AoSortKey) => void
}

export function AoSortSelect({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as AoSortKey)}
      className="rounded-lg border border-[#e0e0e0] bg-[#F9FAFB] px-2.5 py-1.5 text-xs font-medium text-[#6B7280] hover:text-[#1d1d1f] focus:border-[#0066cc] focus:outline-none"
    >
      {AO_SORT_OPTIONS.map(opt => (
        <option key={opt.key} value={opt.key}>정렬: {opt.label}</option>
      ))}
    </select>
  )
}
