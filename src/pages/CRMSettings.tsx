import { useMemo, useState } from 'react'
import type { SheetConnection } from '@/hooks/useSheetConnectionState'
import { MONITORING_GROUPS, type MonitoringGroupId } from '@/lib/monitoringGroups'

interface SheetConnectionProps {
  connection: SheetConnection
  updateField: (field: keyof SheetConnection, value: string) => void
  isConfigured: boolean
}

interface AlertCampaignsProps {
  selected: string[]
  toggle: (campaign: string) => void
  addMany: (campaigns: string[]) => void
  replace: (campaigns: string[]) => void
}

interface Props {
  sheetConnection: SheetConnectionProps
  campaignOptions: string[]
  alertCampaigns: AlertCampaignsProps
  groupKeys: Record<MonitoringGroupId, string[]>
}

type TestStatus =
  | { state: 'idle' }
  | { state: 'testing' }
  | { state: 'success' }
  | { state: 'error'; message: string }

export function CRMSettings({ sheetConnection, campaignOptions, alertCampaigns, groupKeys }: Props) {
  const { connection, updateField } = sheetConnection
  const [testStatus, setTestStatus] = useState<TestStatus>({ state: 'idle' })
  const [campaignSearch, setCampaignSearch] = useState('')

  const filteredCampaignOptions = useMemo(() => {
    const q = campaignSearch.trim().toLowerCase()
    const matched = q ? campaignOptions.filter(c => c.toLowerCase().includes(q)) : campaignOptions
    const selectedSet = new Set(alertCampaigns.selected)
    const checked = matched.filter(c => selectedSet.has(c))
    const unchecked = matched.filter(c => !selectedSet.has(c))
    return [...checked, ...unchecked]
  }, [campaignOptions, campaignSearch, alertCampaigns.selected])

  const selectedSet = new Set(alertCampaigns.selected)
  // 목록에 실제로 존재하는 선택 항목만 센다 (시트에서 사라진 옛 키가 숫자만 부풀리지 않도록)
  const selectedCount = campaignOptions.filter(c => selectedSet.has(c)).length

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

      <Section title="모니터링 대상 캠페인">
        <p className="text-[11px] text-[#9CA3AF] -mt-2">
          체크한 캠페인만 AO 탭 상단에서 전주 대비 발송건수/오픈율/연관거래액 급락(30% 이상)을 감시하고,
          AO 탭의 캠페인 선택 드롭다운에서도 맨 위로 올라옵니다.
          격주·월 단위로 몰아서 발송하는 캠페인은 매주 하락으로 잡히니 체크하지 않는 걸 권장해요.
        </p>

        {[
          {
            title: '담당별 선택',
            presets: MONITORING_GROUPS.map(g => ({ id: g.id as string, label: g.label, keys: groupKeys[g.id] })),
          },
          {
            title: '마티니 운영 전체',
            presets: [{ id: 'all', label: '마티니 운영 전체 (담당 A+B)', keys: MONITORING_GROUPS.flatMap(g => groupKeys[g.id]) }],
          },
        ].map(row => (
          <div key={row.title} className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-[#6B7280]">{row.title}</span>
            {row.presets.map(g => {
              const active = g.keys.length > 0 && g.keys.length === selectedCount && g.keys.every(k => selectedSet.has(k))
              return (
                <button
                  key={g.id}
                  onClick={() => alertCampaigns.replace(g.keys)}
                  disabled={g.keys.length === 0}
                  className={
                    'rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-40 ' +
                    (active
                      ? 'border-[#0066cc] bg-[#E8F0FB] text-[#0066cc]'
                      : 'border-[#e0e0e0] text-[#1d1d1f] hover:bg-[#F9FAFB]')
                  }
                >
                  {g.label} · {g.keys.length}개
                </button>
              )
            })}
          </div>
        ))}

        <input
          type="text"
          value={campaignSearch}
          onChange={e => setCampaignSearch(e.target.value)}
          placeholder="캠페인 검색..."
          className="rounded-lg border border-[#e0e0e0] px-3 py-2 text-sm text-[#1d1d1f] outline-none focus:border-[#0066cc]"
        />

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => alertCampaigns.addMany(filteredCampaignOptions)}
            className="text-[#0066cc] underline"
          >
            모두 선택
          </button>
          <span className="text-[#9CA3AF]">-</span>
          <button onClick={() => alertCampaigns.replace([])} className="text-[#0066cc] underline">
            지우기
          </button>
          <span className="ml-auto text-[11px] text-[#9CA3AF]">
            {campaignSearch.trim() ? `검색 결과 ${filteredCampaignOptions.length}개 · ` : ''}전체 {campaignOptions.length}개
          </span>
        </div>

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
                  checked={selectedSet.has(campaign)}
                  onChange={() => alertCampaigns.toggle(campaign)}
                  className="h-3.5 w-3.5"
                />
                {campaign}
              </label>
            ))
          )}
        </div>

        <p className="text-[11px] text-[#9CA3AF]">{selectedCount}개 선택됨 · 이 브라우저에만 저장됩니다.</p>
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
