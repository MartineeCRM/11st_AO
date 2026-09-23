import { useMemo, useState } from 'react'
import type { SheetConnection } from '@/hooks/useSheetConnectionState'

interface SheetConnectionProps {
  connection: SheetConnection
  updateField: (field: keyof SheetConnection, value: string) => void
  isConfigured: boolean
}

interface AlertCampaignsProps {
  selected: string[]
  toggle: (campaign: string) => void
}

interface Props {
  sheetConnection: SheetConnectionProps
  campaignOptions: string[]
  alertCampaigns: AlertCampaignsProps
}

type TestStatus =
  | { state: 'idle' }
  | { state: 'testing' }
  | { state: 'success' }
  | { state: 'error'; message: string }

export function CRMSettings({ sheetConnection, campaignOptions, alertCampaigns }: Props) {
  const { connection, updateField } = sheetConnection
  const [testStatus, setTestStatus] = useState<TestStatus>({ state: 'idle' })
  const [campaignSearch, setCampaignSearch] = useState('')

  const filteredCampaignOptions = useMemo(() => {
    const q = campaignSearch.trim()
    if (!q) return campaignOptions
    return campaignOptions.filter(c => c.includes(q))
  }, [campaignOptions, campaignSearch])

  async function handleTestConnection() {
    setTestStatus({ state: 'testing' })
    try {
      const params = new URLSearchParams()
      if (connection.sheetName) params.set('sheet', connection.sheetName)
      if (connection.spreadsheetId) params.set('spreadsheetId', connection.spreadsheetId)

      const headers: Record<string, string> = {}
      if (connection.apiKey) headers['x-sheets-api-key'] = connection.apiKey

      const res = await fetch(`/api/sheets?${params.toString()}`, { headers })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        const message = typeof json.error === 'string' ? json.error : `${res.status} 오류`
        setTestStatus({ state: 'error', message })
        return
      }
      setTestStatus({ state: 'success' })
    } catch (err) {
      setTestStatus({ state: 'error', message: err instanceof Error ? err.message : '연결 테스트 실패' })
    }
  }

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

        <div className="flex items-center gap-3">
          <button
            onClick={handleTestConnection}
            disabled={testStatus.state === 'testing'}
            className="rounded-lg bg-[#0066cc] px-4 py-2 text-xs font-medium text-white hover:bg-[#0052a3] disabled:opacity-50"
          >
            {testStatus.state === 'testing' ? '연결 확인 중...' : '연결 테스트'}
          </button>

          {testStatus.state === 'success' && (
            <span className="text-xs font-medium text-[#10B981]">✓ 연결 성공</span>
          )}
          {testStatus.state === 'error' && (
            <span className="text-xs font-medium text-[#EF4444]">✗ {testStatus.message}</span>
          )}
        </div>

        <p className="text-[11px] text-[#9CA3AF]">
          이 브라우저에만 저장됩니다. 다른 사람에게 공유되지 않으며, 본인이 지정한 스프레드시트에만
          접근하는 데 사용됩니다. 비워두면 서버 기본 연결(설정돼 있는 경우)을 사용합니다.
        </p>
      </Section>

      <Section title="알림 대상 캠페인">
        <p className="text-[11px] text-[#9CA3AF] -mt-2">
          체크한 캠페인만 AO 탭 상단에서 전주 대비 발송건수/오픈율/연관거래액 급락(50% 이상)을 감시합니다.
          격주·월 단위로 몰아서 발송하는 캠페인은 매주 하락으로 잡히니 체크하지 않는 걸 권장해요.
        </p>

        <input
          type="text"
          value={campaignSearch}
          onChange={e => setCampaignSearch(e.target.value)}
          placeholder="캠페인 검색..."
          className="rounded-lg border border-[#e0e0e0] px-3 py-2 text-sm text-[#1d1d1f] outline-none focus:border-[#0066cc]"
        />

        <div className="max-h-64 overflow-y-auto rounded-lg border border-[#e0e0e0]">
          {campaignOptions.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-[#9CA3AF]">캠페인 데이터가 아직 없습니다.</p>
          ) : filteredCampaignOptions.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-[#9CA3AF]">검색 결과가 없습니다.</p>
          ) : (
            filteredCampaignOptions.map(campaign => (
              <label
                key={campaign}
                className="flex cursor-pointer items-center gap-2 border-b border-[#F3F4F6] px-3 py-2 text-xs text-[#1d1d1f] last:border-b-0 hover:bg-[#F9FAFB]"
              >
                <input
                  type="checkbox"
                  checked={alertCampaigns.selected.includes(campaign)}
                  onChange={() => alertCampaigns.toggle(campaign)}
                  className="h-3.5 w-3.5"
                />
                {campaign}
              </label>
            ))
          )}
        </div>

        <p className="text-[11px] text-[#9CA3AF]">{alertCampaigns.selected.length}개 선택됨 · 이 브라우저에만 저장됩니다.</p>
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
