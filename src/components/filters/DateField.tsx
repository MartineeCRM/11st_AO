interface Props {
  value: string
  onChange: (v: string) => void
}

export function DateField({ value, onChange }: Props) {
  return (
    <input
      type="date"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="rounded-md border border-[#e0e0e0] bg-white px-2 py-1 text-xs text-[#1d1d1f] tabular-nums focus:border-[#0066cc] focus:outline-none"
    />
  )
}
