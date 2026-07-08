import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Project } from '@/lib/supabase'
import { invalidateSheetDataCache } from '@/hooks/useSheetData'
import { invalidateAttributionDataCache } from '@/hooks/useAttributionData'
import { invalidateBrazeCampaignCache } from '@/hooks/useBrazeCampaigns'
import { useAuth } from '@/hooks/useAuth'
import { useProject } from '@/hooks/useProject'
import { DEFAULT_LAYOUT } from '@/hooks/useDashboardLayout'
import type { TabKey } from '@/lib/supabase'

interface FullSettings {
  id: string
  name: string
  spreadsheet_id: string
  google_api_key: string
  braze_api_key: string | null
  has_google_api_key: boolean
  has_braze_api_key: boolean
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
  const { user } = useAuth()
  const { saveDashboardLayout } = useProject(user?.id ?? null)
  const [layoutSaving, setLayoutSaving] = useState(false)
  const [layoutError, setLayoutError] = useState<string | null>(null)
  const [layoutSuccess, setLayoutSuccess] = useState<string | null>(null)

  const tabVisibility = project.dashboard_layout?.tabVisibility ?? DEFAULT_LAYOUT.tabVisibility

  async function handleToggleTab(tab: TabKey) {
    setLayoutSaving(true)
    setLayoutError(null)
    setLayoutSuccess(null)
    try {
      const nextLayout = {
        ...project.dashboard_layout,
        tabVisibility: { ...tabVisibility, [tab]: !tabVisibility[tab] },
      }
      await saveDashboardLayout(nextLayout)
      setLayoutSuccess('탭 노출 설정이 저장됐습니다.')
      setTimeout(() => setLayoutSuccess(null), 3000)
    } catch (e) {
      setLayoutError(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setLayoutSaving(false)
    }
  }

  async function handleResetLayout() {
    const confirmed = window.confirm(
      '모든 탭의 차트 순서·표시 여부·탭 노출 설정이 기본값으로 되돌아갑니다. 계속할까요?',
    )
    if (!confirmed) return
    setLayoutSaving(true)
    setLayoutError(null)
    setLayoutSuccess(null)
    try {
      await saveDashboardLayout(DEFAULT_LAYOUT)
      setLayoutSuccess('레이아웃이 초기화됐습니다.')
      setTimeout(() => setLayoutSuccess(null), 3000)
    } catch (e) {
      setLayoutError(e instanceof Error ? e.message : '초기화 중 오류가 발생했습니다.')
    } finally {
      setLayoutSaving(false)
    }
  }

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
      let res = await apiFetch('/api/project/settings')
      if (res.status === 401) {
        // session may not be ready yet — wait and retry once
        await new Promise(r => setTimeout(r, 800))
        res = await apiFetch('/api/project/settings')
      }
      if (!res.ok) {
        setError(
          res.status === 401 || res.status === 403
            ? '인증 오류입니다. 페이지를 새로고침 해주세요.'
            : '설정을 불러올 수 없습니다.',
        )
        setLoading(false)
        return
      }
      const data = await res.json() as FullSettings
      setSettings({
        ...data,
        google_api_key: '',
        braze_api_key: '',
        chart_colors: data.chart_colors?.length ? data.chart_colors : DEFAULT_COLORS,
        sheet_mapping: data.sheet_mapping ?? {},
      })
      setLoading(false)
    }
    load()
  }, [project.id])

  async function loadSheetTabs() {
    if (!settings) return
    setSheetLoading(true)
    setSheetError(null)
    const res = await apiFetch('/api/project/sheets-meta', {
      method: 'POST',
      body: JSON.stringify({
        spreadsheet_id: settings.spreadsheet_id,
        google_api_key: settings.google_api_key || undefined,
      }),
    })
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

    const update: Record<string, unknown> = {
      name: settings.name,
      spreadsheet_id: settings.spreadsheet_id,
      braze_base_url: settings.braze_base_url,
      chart_colors: settings.chart_colors,
      sheet_mapping: settings.sheet_mapping,
    }
    if (settings.google_api_key) update.google_api_key = settings.google_api_key
    if (settings.braze_api_key) update.braze_api_key = settings.braze_api_key

    const res = await apiFetch('/api/project/settings', {
      method: 'PATCH',
      body: JSON.stringify(update),
    })

    setSaving(false)
    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? '저장에 실패했습니다.')
    } else {
      invalidateSheetDataCache(project.id)
      invalidateAttributionDataCache(project.id)
      invalidateBrazeCampaignCache(project.id)
      setSettings(prev => prev ? {
        ...prev,
        google_api_key: '',
        braze_api_key: '',
        has_google_api_key: prev.has_google_api_key || Boolean(settings.google_api_key),
        has_braze_api_key: prev.has_braze_api_key || Boolean(settings.braze_api_key),
      } : prev)
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
            type="password"
            value={settings.braze_api_key ?? ''}
            onChange={e => setSettings({ ...settings, braze_api_key: e.target.value })}
            placeholder={settings.has_braze_api_key ? '설정됨 - 변경할 때만 새 키 입력' : 'Braze REST API Key'}
            autoComplete="new-password"
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
            type="password"
            value={settings.google_api_key}
            onChange={e => setSettings({ ...settings, google_api_key: e.target.value })}
            placeholder={settings.has_google_api_key ? '설정됨 - 변경할 때만 새 키 입력' : 'Google Sheets API Key'}
            autoComplete="new-password"
            className={inputCls}
          />
        </Field>
        <button
          onClick={loadSheetTabs}
          disabled={sheetLoading || !settings.spreadsheet_id || (!settings.google_api_key && !settings.has_google_api_key)}
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

      {/* 대시보드 레이아웃 */}
      <Section title="대시보드 레이아웃">
        <div className="flex flex-col gap-3">
          {([
            { key: 'performance' as TabKey, label: 'CRM 성과 모니터링' },
            { key: 'attribution' as TabKey, label: 'CRM Attribution' },
            { key: 'ops' as TabKey, label: '캠페인 운영 현황' },
          ]).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-[#1d1d1f]">{label}</span>
              <button
                onClick={() => handleToggleTab(key)}
                disabled={layoutSaving}
                className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
                  tabVisibility[key] ? 'bg-[#0066cc]' : 'bg-[#D1D5DB]'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    tabVisibility[key] ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={handleResetLayout}
          disabled={layoutSaving}
          className="mt-2 self-start rounded-lg border border-[#EF4444] px-4 py-2 text-xs font-semibold text-[#EF4444] hover:bg-red-50 disabled:opacity-50"
        >
          레이아웃 초기화
        </button>
        {layoutSuccess && <p className="text-xs text-[#10B981]">{layoutSuccess}</p>}
        {layoutError && <p className="text-xs text-[#EF4444]">{layoutError}</p>}
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
