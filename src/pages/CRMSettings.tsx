import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Project } from '@/lib/supabase'

interface FullSettings {
  id: string
  name: string
  spreadsheet_id: string
  google_api_key: string
  braze_api_key: string | null
  braze_base_url: string | null
  chart_colors: string[]
  metric_definitions: { col: string; label: string }[]
  sheet_mapping?: { martinee_union?: string; daily_kpi?: string; att_data?: string }
}

interface SheetTab {
  title: string
  sheetId: number
}

const DEFAULT_COLORS = ['#0066cc', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316']

async function apiFetch(path: string, options?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession()
  const projectId = localStorage.getItem('crm_project_id')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> ?? {}),
  }
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
  if (projectId) headers['X-Project-Id'] = projectId
  return fetch(path, { ...options, headers })
}

interface Props {
  project: Project
}

export function CRMSettings({ project }: Props) {
  const [settings, setSettings] = useState<FullSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // 시트 연결
  const [sheetTabs, setSheetTabs] = useState<SheetTab[]>([])
  const [sheetLoading, setSheetLoading] = useState(false)
  const [sheetError, setSheetError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const res = await apiFetch('/api/project/settings')
      if (!res.ok) {
        setError('설정을 불러올 수 없습니다.')
        setLoading(false)
        return
      }
      const data = await res.json() as FullSettings
      setSettings({
        ...data,
        chart_colors: data.chart_colors?.length ? data.chart_colors : DEFAULT_COLORS,
        sheet_mapping: data.sheet_mapping ?? {},
      })
      setLoading(false)
    }
    load()
  }, [])

  async function loadSheetTabs() {
    if (!settings) return
    setSheetLoading(true)
    setSheetError(null)
    const params = new URLSearchParams({
      spreadsheet_id: settings.spreadsheet_id,
      google_api_key: settings.google_api_key,
    })
    const res = await apiFetch(`/api/project/sheets-meta?${params}`)
    const json = await res.json()
    if (!res.ok) {
      setSheetError(json.error ?? '시트 목록을 불러올 수 없습니다.')
      setSheetLoading(false)
      return
    }
    setSheetTabs(json.sheets ?? [])
    setSheetLoading(false)
  }

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    const res = await apiFetch('/api/project/settings', {
      method: 'PATCH',
      body: JSON.stringify({
        name: settings.name,
        spreadsheet_id: settings.spreadsheet_id,
        google_api_key: settings.google_api_key,
        braze_api_key: settings.braze_api_key,
        braze_base_url: settings.braze_base_url,
        chart_colors: settings.chart_colors,
        sheet_mapping: settings.sheet_mapping,
      }),
    })

    setSaving(false)
    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? '저장에 실패했습니다.')
    } else {
      setSuccess('설정이 저장됐습니다.')
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  function updateColor(index: number, value: string) {
    if (!settings) return
    const colors = [...settings.chart_colors]
    colors[index] = value
    setSettings({ ...settings, chart_colors: colors })
  }

  function addColor() {
    if (!settings || settings.chart_colors.length >= 8) return
    setSettings({ ...settings, chart_colors: [...settings.chart_colors, '#000000'] })
  }

  function removeColor(index: number) {
    if (!settings || settings.chart_colors.length <= 1) return
    const colors = settings.chart_colors.filter((_, i) => i !== index)
    setSettings({ ...settings, chart_colors: colors })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#0066cc] border-t-transparent" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-[#EF4444]">{error ?? '설정을 불러올 수 없습니다.'}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 flex flex-col gap-6">
      <h1 className="text-base font-bold text-[#1d1d1f]">프로젝트 설정</h1>

      {/* 프로젝트 이름 */}
      <Section title="프로젝트">
        <Field label="프로젝트 이름">
          <input
            value={settings.name}
            onChange={e => setSettings({ ...settings, name: e.target.value })}
            className={inputCls}
          />
        </Field>
      </Section>

      {/* Braze */}
      <Section title="Braze 연결">
        <Field label="REST Endpoint URL">
          <input
            value={settings.braze_base_url ?? ''}
            onChange={e => setSettings({ ...settings, braze_base_url: e.target.value })}
            placeholder="https://rest.iad-07.braze.com"
            className={inputCls}
          />
        </Field>
        <Field label="API Key">
          <input
            value={settings.braze_api_key ?? ''}
            onChange={e => setSettings({ ...settings, braze_api_key: e.target.value })}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className={inputCls}
          />
        </Field>
      </Section>

      {/* Google Sheets */}
      <Section title="Google Sheets 연결">
        <Field label="Spreadsheet ID">
          <input
            value={settings.spreadsheet_id}
            onChange={e => setSettings({ ...settings, spreadsheet_id: e.target.value })}
            placeholder="1FgZ_DwZ2_..."
            className={inputCls}
          />
        </Field>
        <Field label="Google API Key">
          <input
            value={settings.google_api_key}
            onChange={e => setSettings({ ...settings, google_api_key: e.target.value })}
            placeholder="AIzaSy..."
            className={inputCls}
          />
        </Field>
        <button
          onClick={loadSheetTabs}
          disabled={sheetLoading || !settings.spreadsheet_id || !settings.google_api_key}
          className="mt-1 rounded-lg border border-[#0066cc] px-4 py-2 text-xs font-semibold text-[#0066cc] hover:bg-[#e8f0fb] disabled:opacity-40"
        >
          {sheetLoading ? '불러오는 중...' : '시트 탭 목록 불러오기'}
        </button>
        {sheetError && <p className="text-xs text-[#EF4444]">{sheetError}</p>}

        {sheetTabs.length > 0 && (
          <div className="mt-3 flex flex-col gap-3 rounded-[18px] border border-[#e0e0e0] p-4">
            <p className="text-xs font-semibold text-[#1d1d1f]">데이터 탭 매핑</p>
            {[
              { key: 'martinee_union', label: 'CRM 성과 데이터 (martinee_union)' },
              { key: 'daily_kpi', label: '비즈니스 KPI (daily_kpi)' },
              { key: 'att_data', label: 'Attribution 데이터 (ATT_DATA)' },
            ].map(({ key, label }) => (
              <Field key={key} label={label}>
                <select
                  value={settings.sheet_mapping?.[key as keyof typeof settings.sheet_mapping] ?? ''}
                  onChange={e => setSettings({
                    ...settings,
                    sheet_mapping: { ...settings.sheet_mapping, [key]: e.target.value },
                  })}
                  className={inputCls}
                >
                  <option value="">— 탭 선택 —</option>
                  {sheetTabs.map(t => (
                    <option key={t.sheetId} value={t.title}>{t.title}</option>
                  ))}
                </select>
              </Field>
            ))}
          </div>
        )}
      </Section>

      {/* 차트 색상 */}
      <Section title="차트 색상">
        <div className="flex flex-wrap gap-3">
          {settings.chart_colors.map((color, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="relative">
                <input
                  type="color"
                  value={color}
                  onChange={e => updateColor(i, e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-lg border border-[#e0e0e0] p-0.5"
                />
              </div>
              <button
                onClick={() => removeColor(i)}
                className="text-[10px] text-[#9CA3AF] hover:text-[#EF4444]"
              >
                삭제
              </button>
            </div>
          ))}
          {settings.chart_colors.length < 8 && (
            <button
              onClick={addColor}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-[#D1D5DB] text-[#9CA3AF] hover:border-[#0066cc] hover:text-[#0066cc]"
            >
              +
            </button>
          )}
        </div>
        <p className="text-[11px] text-[#9CA3AF]">최대 8개. 차트에 순서대로 적용됩니다.</p>
      </Section>

      {/* 저장 */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-[#0066cc] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
        {success && <p className="text-sm text-[#10B981]">{success}</p>}
        {error && <p className="text-sm text-[#EF4444]">{error}</p>}
      </div>
    </div>
  )
}

const inputCls = 'w-full rounded-lg border border-[#e0e0e0] px-3 py-2 text-sm outline-none focus:border-[#0066cc] focus:ring-2 focus:ring-[#e8f0fb]'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#e0e0e0] bg-white p-6 flex flex-col gap-4">
      <p className="text-sm font-semibold text-[#1d1d1f]">{title}</p>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[#6B7280]">{label}</label>
      {children}
    </div>
  )
}
