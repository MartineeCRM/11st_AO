import { useChartColorsState } from '@/hooks/useChartColorsState'

export function CRMSettings() {
  const { colors, updateColor, addColor, removeColor } = useChartColorsState()

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 flex flex-col gap-6">
      <h1 className="text-base font-bold text-[#1d1d1f]">설정</h1>

      <Section title="차트 색상">
        <div className="flex flex-wrap gap-3">
          {colors.map((color, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <input
                type="color"
                value={color}
                onChange={e => updateColor(i, e.target.value)}
                className="h-10 w-10 cursor-pointer rounded-lg border border-[#e0e0e0] p-0.5"
              />
              <button
                onClick={() => removeColor(i)}
                className="text-[10px] text-[#9CA3AF] hover:text-[#EF4444]"
              >
                삭제
              </button>
            </div>
          ))}
          {colors.length < 8 && (
            <button
              onClick={addColor}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-[#D1D5DB] text-[#9CA3AF] hover:border-[#0066cc] hover:text-[#0066cc]"
            >
              +
            </button>
          )}
        </div>
        <p className="text-[11px] text-[#9CA3AF]">최대 8개. 차트에 순서대로 적용됩니다. 이 브라우저에만 저장됩니다.</p>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#e0e0e0] bg-white p-6 flex flex-col gap-4">
      <p className="text-sm font-semibold text-[#1d1d1f]">{title}</p>
      {children}
    </div>
  )
}
