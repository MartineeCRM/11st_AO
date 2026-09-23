import type { SheetConnection } from '@/hooks/useSheetConnectionState'

type ChartColorsProps = {
  colors: string[]
  updateColor: (index: number, value: string) => void
  addColor: () => void
  removeColor: (index: number) => void
}

interface SheetConnectionProps {
  connection: SheetConnection
  updateField: (field: keyof SheetConnection, value: string) => void
  isConfigured: boolean
}

interface Props extends ChartColorsProps {
  sheetConnection: SheetConnectionProps
}

export function CRMSettings({ colors, updateColor, addColor, removeColor, sheetConnection }: Props) {
  const { connection, updateField } = sheetConnection

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 flex flex-col gap-6">
      <h1 className="text-base font-bold text-[#1d1d1f]">설정</h1>

      <Section title="Google Sheets 연결">
        <div className="flex flex-col gap-3">
          <Field
            label="스프레드시트 ID"
            value={connection.spreadsheetId}
            onChange={v => updateField('spreadsheetId', v)}
            placeholder="예: 1kABrxiychb3_Im01c1O2Xt80nt0ov825QXEVX86gchU"
          />
          <Field
            label="시트(탭) 이름"
            value={connection.sheetName}
            onChange={v => updateField('sheetName', v)}
            placeholder="브레이즈 푸시 실적"
          />
          <Field
            label="Google Sheets API 키"
            value={connection.apiKey}
            onChange={v => updateField('apiKey', v)}
            placeholder="AIza..."
            type="password"
          />
        </div>
        <p className="text-[11px] text-[#9CA3AF]">
          이 브라우저에만 저장됩니다. 다른 사람에게 공유되지 않으며, 본인이 지정한 스프레드시트에만
          접근하는 데 사용됩니다. 비워두면 서버 기본 연결(설정돼 있는 경우)을 사용합니다.
        </p>
      </Section>

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

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'password'
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-[#6B7280]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-lg border border-[#e0e0e0] px-3 py-2 text-sm text-[#1d1d1f] outline-none focus:border-[#0066cc]"
        autoComplete="off"
      />
    </label>
  )
}
