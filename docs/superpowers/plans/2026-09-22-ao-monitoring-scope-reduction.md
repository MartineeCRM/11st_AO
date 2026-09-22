# AO Monitoring Scope Reduction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn this multi-tab CRM dashboard (성과 모니터링 / Attribution / 운영 관리 / AO / 설정, Supabase multi-tenant auth) into a single-purpose, single-tenant AO(Always-on) push monitoring app: one AO tab + one 설정(chart colors) tab, reading a brand-new Google Sheet/tab schema, with Supabase fully removed.

**Architecture:** Vite + React + TypeScript SPA, data fetched client-side through a thin Vercel serverless proxy (`api/sheets.ts`) that holds the Google Sheets API key server-side (env vars only, no `VITE_` prefix). No auth, no per-tenant config — `SPREADSHEET_ID` and the sheet's tab name are fixed at build/deploy time via env vars. `src/lib/metrics.ts` gets a from-scratch AO-only rewrite around the new 브레이즈 푸시 실적 sheet columns. Chart colors become a `localStorage`-backed client preference (still editable from Settings), no backend.

**Tech Stack:** React 18, Vite 6, TypeScript 5.6 (strict), Tailwind v4, Recharts, react-day-picker, Vercel serverless functions (`api/*.ts`, untyped-by-tsc — see Global Constraints).

## Global Constraints

- **No test runner exists in this repo.** `package.json` has no `test` script, there is no vitest/jest config, and `find . -iname "*.test.*" -o -iname "*.spec.*"` returns nothing. Do not invent a test framework. Every task's "verify" steps use `npm run type-check`, `npm run lint`, `npm run build`, and manual `npm run dev` + browser/curl checks instead of automated tests.
- **`api/*.ts` is NOT type-checked by `tsc`.** `tsconfig.app.json` only `include`s `"src"` and `tsconfig.node.json` only includes `vite.config.ts`. Neither `npm run type-check` (`tsc --noEmit` via the root `tsconfig.json` references) nor `npm run build` (`tsc && vite build`) ever compiles `api/`. This is why `@vercel/node` (imported with `import type` in every `api/*.ts` file) is not in `package.json` at all — it's resolved by Vercel's own build step at deploy time, not by this repo's tooling. Do not claim `npm run type-check` validates `api/` changes; verify those by reading the code carefully and by exercising `/api/sheets` against the local dev proxy in `vite.config.ts` (which mirrors the same logic and *is* run live).
- **`NODE_ENV=production` is pinned in this environment** (per `CLAUDE.md`). Any `npm install` must pass `--include=dev`, and any script invocation that needs devDependencies must be prefixed `NODE_ENV=development`. Use exactly: `NODE_ENV=development npm install --include=dev`.
- **No `Co-Authored-By` trailer in commits for this repo.** `CLAUDE.md`'s own gotchas say a `Co-Authored-By` tag in the commit message blocks deployment on Vercel Hobby. Every commit step in this plan omits it — do not add one even if a different default instructs otherwise for this repo.
- **Never mix `||` and `??` without parentheses** — `tsc` allows `a || b ?? c` but `vite build` fails on it (documented `CLAUDE.md` gotcha). None of the code in this plan does this; preserve that when editing.
- **Never construct `new Date('')`.** Keep using `parseDateStr`/`normalizeDate` (which guard against empty strings) rather than raw `Date` parsing, per the existing `CLAUDE.md` gotcha.
- **Deploy target is Vercel, not Netlify.** `netlify.toml` (`publish = "docs"`, `ignore = "exit 0"`) is inert — `ignore = "exit 0"` disables Netlify builds unconditionally — and `.gitignore` already excludes `.vercel`. `api/*.ts` uses `VercelRequest`/`VercelResponse` and is deployed as Vercel serverless functions. This plan does not touch `netlify.toml`; it is out of scope and harmless.
- **Env vars prefixed `VITE_` are exposed to the browser** (Vite inlines them at build time). This is exactly why the new Google Sheets credentials use **server-side-only** env var names (`SPREADSHEET_ID`, `GOOGLE_SHEETS_API_KEY`, no `VITE_` prefix) consumed only from `api/sheets.ts` (Node/Vercel runtime) and from `vite.config.ts`'s dev-only proxy (which runs in the Vite dev server process, never in the browser bundle).
- **New Google Sheet**: spreadsheet ID `1kABrxiychb3_Im01c1O2Xt80nt0ov825QXEVX86gchU` ("[11번가] 실적 통합 보기"), tab name `브레이즈 푸시 실적` (gid `1217660716`, but the Sheets values API addresses ranges by tab **name**, not gid — always fetch via `values/{encodeURIComponent(tabName)}!A:O`).
- **Confirmed column order (header row, A–O)**: `일자, 캠페인명, 캠페인명_분할, 배리언트명_분할, XSITE, 수신, 오픈, 오픈율, 결제건수, 결제회원수, 구매전환율, 즉차거래액, 결제순매출액, 분류, 월 구분`. Numeric columns (수신/오픈/결제건수/결제회원수/즉차거래액/결제순매출액) arrive as comma-formatted strings (`"1,138,500"`); percent columns (오픈율/구매전환율) arrive as `"6.94%"` strings. Both must be parsed. `분류` (CONTEXT/BMSIGHT/MASS/#REF!/미분류) is **not** the AO filter.
- **AO campaign filter**: rows where `캠페인명` starts with the literal prefix `AO_`. ~8436 total rows / ~7353 AO-prefixed as of writing — real production scale. Every aggregation function in this plan is a single pass (`reduce`/`Map` grouping), never a nested/quadratic scan over all rows.
- **Aggregate rates are always recomputed from summed raw counts** (e.g. `paymentCount / sent`), never averaged from the sheet's own pre-computed percentage strings — averaging percentages across rows of different sizes is statistically wrong (Simpson's paradox) and the sheet's `오픈율`/`구매전환율` columns are still parsed into `AoPushRow` for fidelity but are not read by any aggregation function.
- This repo **is** a git repository (`origin` → `MartineeCRM/11st_AO`, `upstream` → `MartineeCRM/martinee-crm-dashboard`), working tree currently clean on `main`. Commit after every task as instructed.

---

### Full delete / keep inventory (verified by grep against the current tree before writing this plan)

**Pages deleted:** `CRMPerformance.tsx`, `CRMAttribution.tsx`, `CRMCampaignOps.tsx`, `Login.tsx`, `ProjectSelect.tsx`.

**Components deleted:** `ProtectedRoute.tsx`, `DraggableItemWrapper.tsx`, `DraggableSectionWrapper.tsx`, `EditModeBar.tsx`, `EmptyChartState.tsx`, `ItemSortableRow.tsx`, `LiveCampaignTable.tsx`, `RateWithCount.tsx`, `ScheduledCampaignList.tsx`, `TriggerEventCards.tsx`, `TriggerMappingModal.tsx`, all of `attribution/*` (9 files), all of `cards/*` (2 files), all of `rows/*` (5 files), `charts/AovRevenueComboChart.tsx`, `charts/BusinessKpiTable.tsx`, `charts/ChannelPerformanceTable.tsx`, `charts/ChartNoteOverlay.tsx`, `charts/ChartSectionNote.tsx`, `charts/ConversionFunnel.tsx`, `charts/CustomEventLineChart.tsx`, `charts/DailySendComboChart.tsx`, `charts/OutlierBadge.tsx`, `charts/RevenueRewardComboChart.tsx`, `charts/SendOpenTrendChart.tsx`, `charts/Top10BarChart.tsx`, `filters/FilterBar.tsx`, `filters/MultiSelectFilter.tsx`.

**Components kept (rewritten where noted):** `TopNav.tsx` (rewritten), `AoCampaignDailyTable.tsx` (rewritten), `AoMonthlyPerformanceTable.tsx` (rewritten), `AoPeriodComparisonTable.tsx` (rewritten), `charts/AoCampaignTrendChart.tsx` (rewritten), `filters/CampaignSelectFilter.tsx`, `filters/DatePresetFilter.tsx`, `filters/SegmentedToggle.tsx`, `filters/AoSortSelect.tsx`, `filters/DateField.tsx`, `filters/datePresets.ts` (all four untouched).

**Hooks deleted:** `useAuth.ts`, `useProject.ts`, `useAttributionData.ts`, `useAttributionFiltered.ts`, `useAttributionMetrics.ts`, `useBrazeCampaigns.ts`, `useChartNotes.ts`, `useSectionNotes.ts`, `useDashboardLayout.ts`, `useFilteredData.ts`, `useMetrics.ts`.

**Hooks kept/added:** `useSheetData.ts` (rewritten), `useChartColorsState.ts` (new).

**Lib deleted:** `supabase.ts`, `braze.ts`, `attributionMetrics.ts`, `anomalyThresholds.ts`, `outlier.ts`, `purchaseTargets.ts`.

**Lib kept/rewritten:** `googleSheets.ts` (rewritten), `metrics.ts` (rewritten to AO-only), `formatters.ts` (trimmed), `chartColors.ts` (untouched), `utils.ts` (untouched).

**Types:** `src/types/metrics.ts` deleted entirely. `src/types/sheets.ts` rewritten (`MartineeUnionRow`/`DailyKpiRow`/`AttDataRow`/`FilterState` → `AoPushRow`; `DateRange` kept).

**API routes deleted:** `api/_lib/auth.ts`, `api/config.ts`, `api/project/settings.ts`, `api/project/sheets-meta.ts`, `api/braze/messages/scheduled_broadcasts.js`, `api/braze/canvas/list.js`, `api/braze/canvas/details.js`, `api/braze/campaigns/list.js`, `api/braze/campaigns/details.js`, `api/braze/campaigns/data_series.js`.

**API routes kept/rewritten:** `api/sheets.ts` (rewritten).

**Other:** `supabase/chart_notes.sql` and the `supabase/` directory deleted. `package.json`: drop `@supabase/supabase-js`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`. `vite.config.ts`: drop the Braze dev proxy, rewrite the Sheets dev proxy. `.env.example`: drop Supabase/Braze/`VITE_` Sheets vars, add server-side Sheets vars.

Every deletion above was confirmed by `grep -rl` showing its only importers are other files in this same deletion set (i.e., nothing kept references it) — see the task steps below for the exact final-state grep checks.

---

## Task 1: API proxy + dev config cutover (Supabase- and Braze-free Google Sheets access)

This task is fully independent of the `src/` frontend (nothing in `src/` is touched here) and is safe to do first since `api/*.ts` isn't part of the `tsc` build graph.

**Files:**
- Modify: `api/sheets.ts`
- Delete: `api/_lib/auth.ts`, `api/config.ts`, `api/project/settings.ts`, `api/project/sheets-meta.ts`, `api/braze/messages/scheduled_broadcasts.js`, `api/braze/canvas/list.js`, `api/braze/canvas/details.js`, `api/braze/campaigns/list.js`, `api/braze/campaigns/details.js`, `api/braze/campaigns/data_series.js`
- Modify: `vite.config.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `GET /api/sheets?sheet=<name>` → `{ values: string[][] }` (Google's raw `values.get` response shape, unchanged), driven by server-only env vars `SPREADSHEET_ID` and `GOOGLE_SHEETS_API_KEY`. Defaults `sheet` to `브레이즈 푸시 실적` when the query param is omitted. This is what Task 3's `src/lib/googleSheets.ts` rewrite consumes.

- [ ] **Step 1: Rewrite `api/sheets.ts` to drop Supabase auth and per-project sheet mapping**

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node'

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const DEFAULT_SHEET_NAME = '브레이즈 푸시 실적'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const spreadsheetId = process.env.SPREADSHEET_ID
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY
  if (!spreadsheetId || !apiKey) {
    console.error('[sheets] missing SPREADSHEET_ID or GOOGLE_SHEETS_API_KEY env var')
    return res.status(500).json({ error: 'Server is missing SPREADSHEET_ID or GOOGLE_SHEETS_API_KEY' })
  }

  const { sheet } = req.query as Record<string, string>
  const sheetName = sheet || DEFAULT_SHEET_NAME
  const range = `${sheetName}!A:O`
  const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`

  try {
    const upstream = await fetch(url)
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '')
      console.error('[sheets] upstream error', upstream.status, text)
      return res.status(502).json({ error: `Google Sheets error: ${upstream.status}` })
    }
    const json = await upstream.json()

    // private: 응답에 스프레드시트 전체 범위 데이터가 포함되므로 CDN 공유 캐시 금지
    res.setHeader('Cache-Control', 'private, max-age=300')
    return res.status(200).json(json)
  } catch (err) {
    console.error('[sheets] fetch failed', err)
    return res.status(503).json({ error: 'Failed to reach Google Sheets API' })
  }
}
```

- [ ] **Step 2: Delete the now-dead Supabase-backed and Braze API routes**

```bash
git rm api/_lib/auth.ts api/config.ts api/project/settings.ts api/project/sheets-meta.ts
git rm api/braze/messages/scheduled_broadcasts.js api/braze/canvas/list.js api/braze/canvas/details.js api/braze/campaigns/list.js api/braze/campaigns/details.js api/braze/campaigns/data_series.js
rmdir api/project api/braze/messages api/braze/canvas api/braze/campaigns api/braze api/_lib 2>/dev/null || true
```

- [ ] **Step 3: Confirm nothing under `api/` still references the deleted files**

Run: `grep -rn "verifyProjectAccess\|invalidateProjectCache\|_lib/auth" api/`
Expected: no output (only `api/sheets.ts` remains and it no longer imports `verifyProjectAccess`).

- [ ] **Step 4: Rewrite `vite.config.ts` — drop the Braze dev proxy, update the Sheets dev proxy to the new server-side env vars and fixed tab name**

```ts
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const DEFAULT_SHEET_NAME = '브레이즈 푸시 실적'

function sheetsDevProxy(env: Record<string, string>): Plugin {
  return {
    name: 'sheets-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/sheets', async (req, res) => {
        const spreadsheetId = env.SPREADSHEET_ID || ''
        const apiKey = env.GOOGLE_SHEETS_API_KEY || ''

        if (!spreadsheetId || !apiKey) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: '.env에 SPREADSHEET_ID와 GOOGLE_SHEETS_API_KEY를 확인하세요.' }))
          return
        }

        const incomingUrl = new URL(req.url ?? '/', 'http://localhost')
        const sheet = incomingUrl.searchParams.get('sheet') || DEFAULT_SHEET_NAME
        const range = `${sheet}!A:O`
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`

        try {
          const upstream = await fetch(url)
          const text = await upstream.text()
          res.statusCode = upstream.status
          res.setHeader('Content-Type', 'application/json')
          res.end(text)
        } catch (error) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Sheets proxy failed' }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss(), sheetsDevProxy(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
```

- [ ] **Step 5: Rewrite `.env.example`**

```text
# Google Sheets (서버사이드 전용 — VITE_ prefix 없음, 브라우저에 절대 노출되지 않음)
SPREADSHEET_ID=1kABrxiychb3_Im01c1O2Xt80nt0ov825QXEVX86gchU
GOOGLE_SHEETS_API_KEY=your_google_sheets_api_key_here
```

- [ ] **Step 6: Manually verify the dev proxy against the real sheet**

Create a local `.env` (never committed — already gitignored) with real `SPREADSHEET_ID`/`GOOGLE_SHEETS_API_KEY` values, then:

Run: `NODE_ENV=development npm run dev`

In a second terminal, run: `curl -s "http://localhost:5173/api/sheets?sheet=%EB%B8%8C%EB%A0%88%EC%9D%B4%EC%A6%88%20%ED%91%B8%EC%8B%9C%20%EC%8B%A4%EC%A0%81" | head -c 500`
Expected: JSON starting with `{"range":"...","majorDimension":"ROWS","values":[["일자","캠페인명","캠페인명_분할",...`. If it instead returns the `.env` error JSON, double check the local `.env` values; if it returns a `502`, check the API key has Sheets API access to that spreadsheet.

Stop the dev server (`Ctrl+C`) once confirmed.

- [ ] **Step 7: Commit**

```bash
git add api/sheets.ts vite.config.ts .env.example
git add -u api
git commit -m "refactor(api): drop Supabase auth + Braze proxy, use env-var Google Sheets config"
```

---

## Task 2: Remove multi-tab/auth scaffolding — 2-tab shell, chart-colors-only Settings

Deletes every page/component/hook/lib file whose only purpose was the `performance`/`attribution`/`ops` tabs or Supabase auth/project-switching, and rewrites the shared shell files (`App.tsx`, `TopNav.tsx`, `CRMSettings.tsx`) so the app still builds and runs — on the **old** AO data shape for now (the AO schema cutover is Task 3). The two AO table components lose their Supabase-backed inline-note feature here (its backing hook is deleted in this task); the AO metric field rename happens in Task 3.

**Files:**
- Delete: `src/pages/CRMPerformance.tsx`, `src/pages/CRMAttribution.tsx`, `src/pages/CRMCampaignOps.tsx`, `src/pages/Login.tsx`, `src/pages/ProjectSelect.tsx`
- Delete: `src/components/ProtectedRoute.tsx`, `src/components/DraggableItemWrapper.tsx`, `src/components/DraggableSectionWrapper.tsx`, `src/components/EditModeBar.tsx`, `src/components/EmptyChartState.tsx`, `src/components/ItemSortableRow.tsx`, `src/components/LiveCampaignTable.tsx`, `src/components/RateWithCount.tsx`, `src/components/ScheduledCampaignList.tsx`, `src/components/TriggerEventCards.tsx`, `src/components/TriggerMappingModal.tsx`
- Delete directory contents: `src/components/attribution/*` (9 files), `src/components/cards/*` (2 files), `src/components/rows/*` (5 files)
- Delete: `src/components/charts/AovRevenueComboChart.tsx`, `src/components/charts/BusinessKpiTable.tsx`, `src/components/charts/ChannelPerformanceTable.tsx`, `src/components/charts/ChartNoteOverlay.tsx`, `src/components/charts/ChartSectionNote.tsx`, `src/components/charts/ConversionFunnel.tsx`, `src/components/charts/CustomEventLineChart.tsx`, `src/components/charts/DailySendComboChart.tsx`, `src/components/charts/OutlierBadge.tsx`, `src/components/charts/RevenueRewardComboChart.tsx`, `src/components/charts/SendOpenTrendChart.tsx`, `src/components/charts/Top10BarChart.tsx`
- Delete: `src/components/filters/FilterBar.tsx`, `src/components/filters/MultiSelectFilter.tsx`
- Delete: `src/hooks/useAuth.ts`, `src/hooks/useProject.ts`, `src/hooks/useAttributionData.ts`, `src/hooks/useAttributionFiltered.ts`, `src/hooks/useAttributionMetrics.ts`, `src/hooks/useBrazeCampaigns.ts`, `src/hooks/useChartNotes.ts`, `src/hooks/useSectionNotes.ts`, `src/hooks/useDashboardLayout.ts`, `src/hooks/useFilteredData.ts`, `src/hooks/useMetrics.ts`
- Delete: `src/lib/braze.ts`, `src/lib/attributionMetrics.ts`, `src/lib/anomalyThresholds.ts`, `src/lib/outlier.ts`, `src/lib/purchaseTargets.ts`
- Delete: `src/types/metrics.ts`
- Delete: `supabase/chart_notes.sql` (and the now-empty `supabase/` directory)
- Create: `src/hooks/useChartColorsState.ts`
- Modify: `src/App.tsx`, `src/components/TopNav.tsx`, `src/pages/CRMSettings.tsx`, `src/components/AoMonthlyPerformanceTable.tsx`, `src/components/AoPeriodComparisonTable.tsx`, `package.json`

**Interfaces:**
- Consumes (unchanged from before this task): `useSheetData()` still returns `{ martinee, kpi, kpiEventColumns, loading, error, dateRange }` reading `MartineeUnionRow[]` (Task 3 changes this); `src/lib/metrics.ts` still exports the old AO functions (`filterAoRows`, `listAoCampaignNames`, `buildAoCampaignTrend`, etc.) operating on `MartineeUnionRow` (untouched in this task).
- Produces: `useChartColorsState(): { colors: string[]; updateColor(i: number, v: string): void; addColor(): void; removeColor(index: number): void }` — new hook Task 3+ and `App.tsx` consume for `ChartColorsContext.Provider`.
- Produces: `Tab = 'ao' | 'settings'` in both `App.tsx` and `TopNav.tsx` (previously `'performance' | 'attribution' | 'ops' | 'ao' | 'settings'`).

- [ ] **Step 1: Delete the dead pages**

```bash
git rm src/pages/CRMPerformance.tsx src/pages/CRMAttribution.tsx src/pages/CRMCampaignOps.tsx src/pages/Login.tsx src/pages/ProjectSelect.tsx
```

- [ ] **Step 2: Delete the dead components**

```bash
git rm src/components/ProtectedRoute.tsx src/components/DraggableItemWrapper.tsx src/components/DraggableSectionWrapper.tsx src/components/EditModeBar.tsx src/components/EmptyChartState.tsx src/components/ItemSortableRow.tsx src/components/LiveCampaignTable.tsx src/components/RateWithCount.tsx src/components/ScheduledCampaignList.tsx src/components/TriggerEventCards.tsx src/components/TriggerMappingModal.tsx
git rm -r src/components/attribution src/components/cards src/components/rows
git rm src/components/charts/AovRevenueComboChart.tsx src/components/charts/BusinessKpiTable.tsx src/components/charts/ChannelPerformanceTable.tsx src/components/charts/ChartNoteOverlay.tsx src/components/charts/ChartSectionNote.tsx src/components/charts/ConversionFunnel.tsx src/components/charts/CustomEventLineChart.tsx src/components/charts/DailySendComboChart.tsx src/components/charts/OutlierBadge.tsx src/components/charts/RevenueRewardComboChart.tsx src/components/charts/SendOpenTrendChart.tsx src/components/charts/Top10BarChart.tsx
git rm src/components/filters/FilterBar.tsx src/components/filters/MultiSelectFilter.tsx
```

- [ ] **Step 3: Delete the dead hooks, lib files, and the now-orphaned types/metrics.ts**

```bash
git rm src/hooks/useAuth.ts src/hooks/useProject.ts src/hooks/useAttributionData.ts src/hooks/useAttributionFiltered.ts src/hooks/useAttributionMetrics.ts src/hooks/useBrazeCampaigns.ts src/hooks/useChartNotes.ts src/hooks/useSectionNotes.ts src/hooks/useDashboardLayout.ts src/hooks/useFilteredData.ts src/hooks/useMetrics.ts
git rm src/lib/braze.ts src/lib/attributionMetrics.ts src/lib/anomalyThresholds.ts src/lib/outlier.ts src/lib/purchaseTargets.ts
git rm src/types/metrics.ts
git rm supabase/chart_notes.sql
rmdir supabase 2>/dev/null || true
```

- [ ] **Step 4: Create `src/hooks/useChartColorsState.ts` — localStorage-backed chart color preference**

```ts
import { useEffect, useState } from 'react'
import { DEFAULT_CHART_COLORS } from '@/lib/chartColors'

const STORAGE_KEY = 'crm_chart_colors'
const MAX_COLORS = 8

function loadColors(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CHART_COLORS
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 && parsed.every(c => typeof c === 'string')
      ? parsed
      : DEFAULT_CHART_COLORS
  } catch {
    return DEFAULT_CHART_COLORS
  }
}

export function useChartColorsState() {
  const [colors, setColors] = useState<string[]>(loadColors)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(colors))
    } catch {
      // localStorage 접근 불가(프라이빗 모드 등) — 조용히 무시, 세션 내 상태는 계속 동작
    }
  }, [colors])

  function updateColor(index: number, value: string) {
    setColors(prev => prev.map((c, i) => (i === index ? value : c)))
  }

  function addColor() {
    setColors(prev => (prev.length >= MAX_COLORS ? prev : [...prev, '#000000']))
  }

  function removeColor(index: number) {
    setColors(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  return { colors, updateColor, addColor, removeColor }
}
```

- [ ] **Step 5: Rewrite `src/App.tsx` — two tabs, no auth/project plumbing**

```tsx
import { useState, lazy, Suspense, Component, type ReactNode, type ErrorInfo } from 'react'
import { TopNav } from '@/components/TopNav'
const CRMAlwaysOn = lazy(() => import('@/pages/CRMAlwaysOn').then(m => ({ default: m.CRMAlwaysOn })))
import { CRMSettings } from '@/pages/CRMSettings'
import { ChartColorsContext } from '@/lib/chartColors'
import { useChartColorsState } from '@/hooks/useChartColorsState'

export type Tab = 'ao' | 'settings'

const CHUNK_RELOAD_KEY = 'crm_dashboard_chunk_reload_attempted'

function isDynamicImportError(error: Error): boolean {
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk/i.test(error.message)
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
    if (isDynamicImportError(error) && sessionStorage.getItem(CHUNK_RELOAD_KEY) !== '1') {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
      window.location.reload()
    }
  }
  render() {
    const { error } = this.state
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <p className="text-sm font-semibold text-[#EF4444]">렌더 오류 발생</p>
          <pre className="max-w-2xl rounded-lg bg-[#FEF2F2] p-4 text-xs text-[#EF4444] whitespace-pre-wrap break-all">
            {error.message}
            {'\n'}
            {error.stack}
          </pre>
          <button
            className="rounded-lg bg-[#0066cc] px-4 py-2 text-xs text-white"
            onClick={() => this.setState({ error: null })}
          >
            다시 시도
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('ao')
  const { colors } = useChartColorsState()

  function handleTabChange(tab: Tab) {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY)
    setActiveTab(tab)
  }

  return (
    <ChartColorsContext.Provider value={colors}>
      <div className="min-h-screen bg-[#f5f5f7]">
        <TopNav activeTab={activeTab} onTabChange={handleTabChange} />
        <main>
          <ErrorBoundary>
            {activeTab === 'ao' && (
              <Suspense fallback={<div className="flex h-64 items-center justify-center"><div className="h-5 w-5 animate-spin rounded-full border-2 border-[#0066cc] border-t-transparent" /></div>}>
                <CRMAlwaysOn />
              </Suspense>
            )}
            {activeTab === 'settings' && <CRMSettings />}
          </ErrorBoundary>
        </main>
      </div>
    </ChartColorsContext.Provider>
  )
}
```

- [ ] **Step 6: Rewrite `src/components/TopNav.tsx` — two tabs, no project switcher, no sign-out**

```tsx
import { cn } from '@/lib/utils'
import type { Tab } from '@/App'

interface Props {
  activeTab: Tab
  onTabChange: (t: Tab) => void
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'ao', label: 'AO 캠페인 모니터링' },
  { key: 'settings', label: '설정' },
]

export function TopNav({ activeTab, onTabChange }: Props) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center border-b border-[#e0e0e0] bg-white px-6">
      <div className="flex items-center gap-2 mr-8">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0066cc]">
          <span className="text-xs font-bold text-white">M</span>
        </div>
        <span className="text-sm font-bold text-[#1d1d1f]">CRM Dashboard</span>
      </div>

      <nav className="flex items-center gap-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={cn(
              'relative px-3 py-1.5 text-sm font-medium transition-colors',
              activeTab === key
                ? 'text-[#0066cc]'
                : 'text-[#6B7280] hover:text-[#1d1d1f]',
            )}
          >
            {label}
            {activeTab === key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#0066cc]" />
            )}
          </button>
        ))}
      </nav>
    </header>
  )
}
```

- [ ] **Step 7: Rewrite `src/pages/CRMSettings.tsx` — chart colors only, no fetch/save round-trip**

```tsx
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
```

- [ ] **Step 8: Strip the Supabase-backed inline note feature out of `AoMonthlyPerformanceTable.tsx`**

In `src/components/AoMonthlyPerformanceTable.tsx`, remove the `ChartSectionNote` import and replace its usage with a plain heading (the note-editing feature depended on the `chart_notes` Supabase table being deleted in this task — there is no replacement, per "fully remove Supabase"):

```tsx
// remove: import { ChartSectionNote } from './charts/ChartSectionNote'
```

```tsx
// before:
          <ChartSectionNote sectionId="ao_monthly_table" title="캠페인 × 월 실적표" titleClassName="text-xs font-semibold text-[#1d1d1f]" />
// after:
          <p className="text-xs font-semibold text-[#1d1d1f]">캠페인 × 월 실적표</p>
```

(Note: `sectionId="ao_monthly_table"` was never actually a member of the `SectionId` union exported from `src/lib/supabase.ts` — this was a pre-existing latent type error that only escaped notice because `noUnusedLocals`/strict mode don't catch prop-type mismatches at this granularity in every editor; removing the component removes the error along with it.)

- [ ] **Step 9: Same strip for `AoPeriodComparisonTable.tsx`**

```tsx
// remove: import { ChartSectionNote } from './charts/ChartSectionNote'
```

```tsx
// before:
          <ChartSectionNote sectionId="ao_period_comparison" title="기간 비교" titleClassName="text-xs font-semibold text-[#1d1d1f]" />
// after:
          <p className="text-xs font-semibold text-[#1d1d1f]">기간 비교</p>
```

- [ ] **Step 10: Remove now-dead dependencies from `package.json`**

Edit `package.json` `dependencies` to delete these four lines (everything else stays — `@supabase/supabase-js` is still imported by `src/lib/googleSheets.ts` at this point and is removed in Task 3, not here):

```diff
-    "@dnd-kit/core": "^6.3.1",
-    "@dnd-kit/sortable": "^10.0.0",
-    "@dnd-kit/utilities": "^3.2.2",
```

(Leave `@radix-ui/*`, `date-fns`, `source-map` alone — a repo-wide `grep` shows they already have zero importers even before this refactor; that's pre-existing dead weight unrelated to this task's scope, not something introduced or required by it.)

- [ ] **Step 11: Reinstall to sync `package-lock.json`**

Run: `NODE_ENV=development npm install --include=dev`
Expected: exits 0, `package-lock.json` updates to drop the three `@dnd-kit/*` packages.

- [ ] **Step 12: Verify nothing still references deleted modules**

Run: `grep -rn "@dnd-kit\|DraggableSectionWrapper\|DraggableItemWrapper\|EditModeBar\|useDashboardLayout\|useAuth\|useProject\b\|ProtectedRoute\|ChartSectionNote\|useSectionNotes\|useBrazeCampaigns\|useAttributionData\|useAttributionFiltered\|useAttributionMetrics\|useChartNotes\|useFilteredData\|useMetrics\b\|lib/braze\|lib/supabase\|attributionMetrics\|anomalyThresholds\|purchaseTargets\|lib/outlier" src/`
Expected: only `src/lib/googleSheets.ts` shows up for `lib/supabase` (still importing `supabase` there until Task 3) — every other pattern returns no output.

- [ ] **Step 13: Type-check, lint, build**

Run: `NODE_ENV=development npm run type-check`
Expected: PASS, no errors.

Run: `NODE_ENV=development npm run lint`
Expected: PASS, no errors.

Run: `NODE_ENV=development npm run build`
Expected: PASS, `dist/` produced.

- [ ] **Step 14: Manual smoke test**

Run: `NODE_ENV=development npm run dev`, open the printed local URL in a browser.
Expected: only two tabs render ("AO 캠페인 모니터링", "설정"); the AO tab loads (still against the *old* sheet schema — data may look wrong/empty here, that's expected and fixed in Task 3); the 설정 tab shows only the 차트 색상 picker, no login screen, no project switcher. Stop the dev server once confirmed.

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "refactor: remove performance/attribution/ops tabs, Supabase auth, and dead code; trim Settings to chart colors"
```

---

## Task 3: AO schema cutover — new sheet columns, new metrics, updated AO components

Rewrites the data layer end to end around the new `브레이즈 푸시 실적` columns, and updates every consumer in the same pass so the repo is never left half-migrated.

**Files:**
- Modify: `src/types/sheets.ts`
- Modify: `src/lib/googleSheets.ts`
- Modify: `src/lib/metrics.ts`
- Modify: `src/lib/formatters.ts`
- Modify: `src/hooks/useSheetData.ts`
- Delete: `src/lib/supabase.ts`
- Modify: `src/components/charts/AoCampaignTrendChart.tsx`
- Modify: `src/components/AoCampaignDailyTable.tsx`
- Modify: `src/components/AoMonthlyPerformanceTable.tsx`
- Modify: `src/components/AoPeriodComparisonTable.tsx`
- Modify: `src/pages/CRMAlwaysOn.tsx`
- Modify: `package.json`

**Interfaces:**
- Produces `AoPushRow` (`src/types/sheets.ts`):
  ```ts
  export interface AoPushRow {
    date: string; campaignName: string; campaignSplit: string; variantSplit: string; xsite: string
    sent: number; opens: number; openRate: number; paymentCount: number; payingMembers: number
    conversionRate: number; grossAmount: number; netRevenue: number; category: string; monthLabel: string
  }
  ```
- Produces `fetchAoPushRows(): Promise<AoPushRow[]>` (`src/lib/googleSheets.ts`), date-ascending sorted.
- Produces from `src/lib/metrics.ts`: `filterAoRows(rows: AoPushRow[]): AoPushRow[]`; `listAoCampaignNames(rows): string[]`; `buildAoCampaignTrend(rows, campaign, granularity): AoTrendPoint[]` where `AoTrendPoint = { period: string; sent: number; paymentCount: number; paymentRate: number; netRevenue: number }`; `buildAoCampaignDailyRows(rows, campaign): AoDailyRow[]` where `AoDailyRow = { date, sent, opens, openRate, paymentCount, paymentRate, payingMembers, payingMemberRate, grossAmount, netRevenue }`; `AoMonthlyMetrics = { sent, opens, paymentCount, payingMembers, grossAmount, netRevenue }`; `buildAoPivot(rows, years): AoPivotResult`; `listAoYears(rows): string[]`; `AoPeriodRow = { campaign, sent, opens, openRate, paymentCount, paymentRate, payingMembers, payingMemberRate, grossAmount, netRevenue }`; `buildAoPeriodTable(rows, start, end): AoPeriodRow[]`; `AoSortKey = 'name' | 'revenue' | 'reach' | 'paymentCount' | 'paymentRate'`; `AO_SORT_OPTIONS`; `sortByAoMetric`; `monthLabel`, `shiftYears`, `calcYoY`, `calcPeriodDelta`, `previousPeriodOfSameLength` (unchanged behavior, generic).
- Produces `useSheetData(): { rows: AoPushRow[]; loading: boolean; error: string | null; dateRange: { min: string; max: string } | null }` (renamed from `martinee` → `rows`, single-tenant cache, no `kpi`/`kpiEventColumns`).

- [ ] **Step 1: Rewrite `src/types/sheets.ts`**

```ts
export interface AoPushRow {
  date: string             // 일자, YYYY-MM-DD
  campaignName: string     // 캠페인명 (전체 기술명) — 'AO_' 접두사로 AO 캠페인 여부 판별
  campaignSplit: string    // 캠페인명_분할 — 사람이 읽는 캠페인명, 캠페인 목록/그룹핑 기준
  variantSplit: string     // 배리언트명_분할 — 캠페인명_분할이 같은 여러 배리언트를 구분
  xsite: string            // XSITE
  sent: number             // 수신
  opens: number            // 오픈
  openRate: number         // 오픈율 (0~1 비율로 파싱)
  paymentCount: number     // 결제건수
  payingMembers: number    // 결제회원수
  conversionRate: number   // 구매전환율 (0~1 비율로 파싱, 시트 원본값 — 집계 함수는 합산 후 재계산치를 사용)
  grossAmount: number      // 즉차거래액
  netRevenue: number       // 결제순매출액
  category: string         // 분류 (CONTEXT/BMSIGHT/MASS/#REF!/미분류) — AO 필터링에는 사용하지 않음
  monthLabel: string       // 월 구분
}

export interface DateRange {
  start: string   // YYYY-MM-DD
  end: string     // YYYY-MM-DD
}
```

- [ ] **Step 2: Rewrite `src/lib/googleSheets.ts`**

```ts
import type { AoPushRow } from '@/types/sheets'
import { normalizeDate } from './formatters'

const AO_SHEET_NAME = '브레이즈 푸시 실적'

// /api/sheets 프록시를 통해 시트 데이터를 가져옴 — 서버 측 env var로 인증하므로 클라이언트는 헤더 불필요
async function fetchSheet(sheetName: string): Promise<string[][]> {
  const res = await fetch(`/api/sheets?sheet=${encodeURIComponent(sheetName)}`)
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(`Google Sheets API 오류 [${sheetName}]: ${res.status} ${json.error ?? ''}`)
  }
  const json = (await res.json()) as { values?: string[][] }
  return json.values ?? []
}

function parseNumber(cell: string | undefined): number {
  if (!cell) return 0
  const stripped = cell.replace(/,/g, '').trim()
  const n = parseFloat(stripped)
  return Number.isNaN(n) ? 0 : n
}

function parsePercent(cell: string | undefined): number {
  if (!cell) return 0
  const stripped = cell.replace(/,/g, '').replace(/%/g, '').trim()
  const n = parseFloat(stripped)
  return Number.isNaN(n) ? 0 : n / 100
}

/**
 * 열 순서 고정: 일자, 캠페인명, 캠페인명_분할, 배리언트명_분할, XSITE, 수신, 오픈, 오픈율,
 * 결제건수, 결제회원수, 구매전환율, 즉차거래액, 결제순매출액, 분류, 월 구분
 */
function normalizeAoPushRow(row: string[]): AoPushRow {
  return {
    date: normalizeDate(row[0] ?? ''),
    campaignName: row[1] ?? '',
    campaignSplit: row[2] ?? '',
    variantSplit: row[3] ?? '',
    xsite: row[4] ?? '',
    sent: parseNumber(row[5]),
    opens: parseNumber(row[6]),
    openRate: parsePercent(row[7]),
    paymentCount: parseNumber(row[8]),
    payingMembers: parseNumber(row[9]),
    conversionRate: parsePercent(row[10]),
    grossAmount: parseNumber(row[11]),
    netRevenue: parseNumber(row[12]),
    category: row[13] ?? '',
    monthLabel: row[14] ?? '',
  }
}

export async function fetchAoPushRows(): Promise<AoPushRow[]> {
  const raw = await fetchSheet(AO_SHEET_NAME)
  if (raw.length < 2) return []
  return raw.slice(1).map(normalizeAoPushRow).sort((a, b) => a.date.localeCompare(b.date))
}
```

- [ ] **Step 3: Rewrite `src/lib/metrics.ts` — AO-only functions on the new schema**

```ts
import type { AoPushRow } from '@/types/sheets'
import { addDays, formatDateShort, parseDateStr, toDateStr } from './formatters'

// ─── AO(Always-on) 캠페인 모니터링 ──────────────────────────────

/** 캠페인명이 'AO_'로 시작하는 행만 필터링 */
export function filterAoRows(rows: AoPushRow[]): AoPushRow[] {
  return rows.filter(r => r.campaignName.startsWith('AO_'))
}

/**
 * AO 캠페인 식별 키. 캠페인명_분할만 쓰면 서로 다른 배리언트가 같은 이름으로 뭉쳐 보이는
 * 경우가 있어, 배리언트명_분할이 있으면 붙여서 구분한다.
 */
function aoCampaignKey(r: AoPushRow): string {
  if (!r.campaignSplit) return ''
  return r.variantSplit ? `${r.campaignSplit} · ${r.variantSplit}` : r.campaignSplit
}

/** AO 캠페인 목록 (캠페인명_분할 + 배리언트명_분할 기준), 가나다순 */
export function listAoCampaignNames(rows: AoPushRow[]): string[] {
  const names = new Set<string>()
  for (const r of rows) {
    const key = aoCampaignKey(r)
    if (key) names.add(key)
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'ko'))
}

export interface AoTrendPoint {
  period: string
  sent: number
  paymentCount: number
  /** paymentCount ÷ sent */
  paymentRate: number
  netRevenue: number
}

/** 날짜 → 그 주(월요일 시작) 첫날, YYYY-MM-DD */
function weekStart(dateStr: string): string {
  const d = parseDateStr(dateStr)
  if (!d) return dateStr
  const day = d.getDay() // 0=일 .. 6=토
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  return toDateStr(monday)
}

/** 날짜 → 월 (YYYY-MM) */
function monthStart(dateStr: string): string {
  return dateStr.slice(0, 7)
}

/** 특정 AO 캠페인의 일/주/월 단위 합산 추이 */
export function buildAoCampaignTrend(
  rows: AoPushRow[],
  campaign: string,
  granularity: 'day' | 'week' | 'month',
): AoTrendPoint[] {
  const campaignRows = rows.filter(r => aoCampaignKey(r) === campaign)
  const byPeriod = new Map<string, AoPushRow[]>()
  for (const r of campaignRows) {
    const key = granularity === 'day' ? r.date : granularity === 'week' ? weekStart(r.date) : monthStart(r.date)
    const list = byPeriod.get(key) ?? []
    list.push(r)
    byPeriod.set(key, list)
  }
  return [...byPeriod.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, rs]) => {
      const sent = rs.reduce((s, r) => s + r.sent, 0)
      const paymentCount = rs.reduce((s, r) => s + r.paymentCount, 0)
      const netRevenue = rs.reduce((s, r) => s + r.netRevenue, 0)
      return {
        period: granularity === 'month' ? monthLabel(period) : formatDateShort(period),
        sent,
        paymentCount,
        paymentRate: sent > 0 ? paymentCount / sent : 0,
        netRevenue,
      }
    })
}

export interface AoDailyRow {
  date: string
  sent: number
  opens: number
  /** opens ÷ sent */
  openRate: number
  paymentCount: number
  /** paymentCount ÷ sent */
  paymentRate: number
  payingMembers: number
  /** payingMembers ÷ sent */
  payingMemberRate: number
  grossAmount: number
  netRevenue: number
}

/** 특정 AO 캠페인의 일자별 실적 — 최신 날짜가 먼저 */
export function buildAoCampaignDailyRows(rows: AoPushRow[], campaign: string): AoDailyRow[] {
  const campaignRows = rows.filter(r => aoCampaignKey(r) === campaign)
  const byDate = new Map<string, AoPushRow[]>()
  for (const r of campaignRows) {
    const list = byDate.get(r.date) ?? []
    list.push(r)
    byDate.set(r.date, list)
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, rs]) => {
      const sent = rs.reduce((s, r) => s + r.sent, 0)
      const opens = rs.reduce((s, r) => s + r.opens, 0)
      const paymentCount = rs.reduce((s, r) => s + r.paymentCount, 0)
      const payingMembers = rs.reduce((s, r) => s + r.payingMembers, 0)
      const grossAmount = rs.reduce((s, r) => s + r.grossAmount, 0)
      const netRevenue = rs.reduce((s, r) => s + r.netRevenue, 0)
      return {
        date,
        sent,
        opens,
        openRate: sent > 0 ? opens / sent : 0,
        paymentCount,
        paymentRate: sent > 0 ? paymentCount / sent : 0,
        payingMembers,
        payingMemberRate: sent > 0 ? payingMembers / sent : 0,
        grossAmount,
        netRevenue,
      }
    })
}

export interface AoMonthlyMetrics {
  sent: number
  opens: number
  paymentCount: number
  payingMembers: number
  grossAmount: number
  netRevenue: number
}

export interface AoPivotRow {
  campaign: string
  /** YYYY-MM 단위 실적 (그 캠페인이 실제 발송한 달만 존재) */
  byMonth: Record<string, AoMonthlyMetrics>
  /** YYYY 단위 연간 합계 (연도가 접혔을 때 표시) */
  byYear: Record<string, AoMonthlyMetrics>
}

export interface AoPivotResult {
  /** 펼쳐진(요청된) 연도, 최신순 */
  years: string[]
  /** 연도별로 실제 데이터가 존재하는 월 목록 (그 연도 내림차순) */
  monthsByYear: Record<string, string[]>
  rows: AoPivotRow[]
}

function sumAoMetrics(rs: AoPushRow[]): AoMonthlyMetrics {
  return {
    sent: rs.reduce((s, r) => s + r.sent, 0),
    opens: rs.reduce((s, r) => s + r.opens, 0),
    paymentCount: rs.reduce((s, r) => s + r.paymentCount, 0),
    payingMembers: rs.reduce((s, r) => s + r.payingMembers, 0),
    grossAmount: rs.reduce((s, r) => s + r.grossAmount, 0),
    netRevenue: rs.reduce((s, r) => s + r.netRevenue, 0),
  }
}

/** 날짜 → 연 (YYYY) */
function yearOf(dateStr: string): string {
  return dateStr.slice(0, 4)
}

/** AO 데이터에 존재하는 전체 연도 목록 (최신순) */
export function listAoYears(rows: AoPushRow[]): string[] {
  return [...new Set(rows.map(r => yearOf(r.date)))].sort().reverse()
}

/**
 * AO 캠페인 실적 피벗 (연도 단위로 펼침/접음 가능).
 * years에 포함된 해에 한 번이라도 발송한 캠페인만 행으로 포함하고,
 * 캠페인·월 조합에 실제 발송 데이터가 없으면 byMonth에 항목 자체를 만들지 않는다.
 */
export function buildAoPivot(rows: AoPushRow[], years: string[]): AoPivotResult {
  const yearSet = new Set(years)
  const relevantRows = rows.filter(r => yearSet.has(yearOf(r.date)))

  const monthsByYear: Record<string, string[]> = {}
  for (const year of years) {
    monthsByYear[year] = [...new Set(
      relevantRows.filter(r => yearOf(r.date) === year).map(r => monthStart(r.date)),
    )].sort().reverse()
  }

  const byCampaign = new Map<string, AoPushRow[]>()
  for (const r of relevantRows) {
    const key = aoCampaignKey(r)
    if (!key) continue
    const list = byCampaign.get(key) ?? []
    list.push(r)
    byCampaign.set(key, list)
  }

  const pivotRows: AoPivotRow[] = [...byCampaign.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'ko'))
    .map(([campaign, campaignRows]) => {
      const byMonth: Record<string, AoMonthlyMetrics> = {}
      const byYear: Record<string, AoMonthlyMetrics> = {}
      for (const year of years) {
        const yearRows = campaignRows.filter(r => yearOf(r.date) === year)
        if (yearRows.length === 0) continue
        byYear[year] = sumAoMetrics(yearRows)
        for (const month of monthsByYear[year]) {
          const monthRows = yearRows.filter(r => monthStart(r.date) === month)
          if (monthRows.length > 0) byMonth[month] = sumAoMetrics(monthRows)
        }
      }
      return { campaign, byMonth, byYear }
    })

  return { years, monthsByYear, rows: pivotRows }
}

/** "YYYY-MM" → "N월" */
export function monthLabel(yyyyMm: string): string {
  const m = Number(yyyyMm.slice(5, 7))
  return `${m}월`
}

/** 날짜 문자열의 연도만 n만큼 이동 (월/일은 그대로 유지) */
export function shiftYears(dateStr: string, n: number): string {
  if (!dateStr) return dateStr
  const year = Number(dateStr.slice(0, 4))
  return `${year + n}${dateStr.slice(4)}`
}

/** 전년 대비 증감률. 작년 값이 0/없으면 비교 불가로 null */
export function calcYoY(current: number, previous: number | undefined): number | null {
  if (!previous) return null
  return (current - previous) / previous
}

/** 두 기간(비교 대상) 간 증감률. previous가 0/없으면 비교 불가로 null */
export function calcPeriodDelta(current: number, previous: number): number | null {
  if (!previous) return null
  return (current - previous) / previous
}

/** start~end와 같은 길이의, 바로 직전 기간을 반환 (예: 9/1~9/15 → 8/17~8/31) */
export function previousPeriodOfSameLength(start: string, end: string): { start: string; end: string } {
  const s = parseDateStr(start)
  const e = parseDateStr(end)
  if (!s || !e) return { start: '', end: '' }
  const lengthDays = Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1
  const newEnd = addDays(start, -1)
  const newStart = addDays(newEnd, -(lengthDays - 1))
  return { start: newStart, end: newEnd }
}

export interface AoPeriodRow {
  campaign: string
  sent: number
  opens: number
  openRate: number
  paymentCount: number
  paymentRate: number
  payingMembers: number
  payingMemberRate: number
  grossAmount: number
  netRevenue: number
}

/**
 * 특정 기간(start~end)의 AO 캠페인별 실적 리더보드.
 * 두 기간(예: 올해 vs 작년 동기간)을 나란히 비교하는 화면에서 각 기간을 독립적으로 호출해 쓴다.
 */
export function buildAoPeriodTable(rows: AoPushRow[], start: string, end: string): AoPeriodRow[] {
  const inRange = rows.filter(r => (!start || r.date >= start) && (!end || r.date <= end))

  const byCampaign = new Map<string, AoPushRow[]>()
  for (const r of inRange) {
    const key = aoCampaignKey(r)
    if (!key) continue
    const list = byCampaign.get(key) ?? []
    list.push(r)
    byCampaign.set(key, list)
  }

  return [...byCampaign.entries()].map(([campaign, rs]) => {
    const sent = rs.reduce((s, r) => s + r.sent, 0)
    const opens = rs.reduce((s, r) => s + r.opens, 0)
    const paymentCount = rs.reduce((s, r) => s + r.paymentCount, 0)
    const payingMembers = rs.reduce((s, r) => s + r.payingMembers, 0)
    const grossAmount = rs.reduce((s, r) => s + r.grossAmount, 0)
    const netRevenue = rs.reduce((s, r) => s + r.netRevenue, 0)
    return {
      campaign,
      sent,
      opens,
      openRate: sent > 0 ? opens / sent : 0,
      paymentCount,
      paymentRate: sent > 0 ? paymentCount / sent : 0,
      payingMembers,
      payingMemberRate: sent > 0 ? payingMembers / sent : 0,
      grossAmount,
      netRevenue,
    }
  })
}

export type AoSortKey = 'name' | 'revenue' | 'reach' | 'paymentCount' | 'paymentRate'

export const AO_SORT_OPTIONS: { key: AoSortKey; label: string }[] = [
  { key: 'name', label: '캠페인명 (가나다순)' },
  { key: 'revenue', label: '순매출 높은순' },
  { key: 'reach', label: '수신 높은순' },
  { key: 'paymentCount', label: '결제건수 높은순' },
  { key: 'paymentRate', label: '구매전환율 높은순' },
]

interface AoSortable {
  campaign: string
  netRevenue: number
  sent: number
  paymentCount: number
}

function paymentRateOf(m: AoSortable): number {
  return m.sent > 0 ? m.paymentCount / m.sent : 0
}

/** 캠페인 목록/피벗 행 등을 공통 정렬 기준으로 정렬. rows 자체는 AoSortable 모양이 아니어도 toMetrics로 뽑아내면 됨 */
export function sortByAoMetric<T>(rowsIn: T[], sortKey: AoSortKey, toMetrics: (row: T) => AoSortable): T[] {
  const arr = [...rowsIn]
  arr.sort((a, b) => {
    const ma = toMetrics(a)
    const mb = toMetrics(b)
    if (sortKey === 'name') return ma.campaign.localeCompare(mb.campaign, 'ko')
    if (sortKey === 'revenue') return mb.netRevenue - ma.netRevenue
    if (sortKey === 'reach') return mb.sent - ma.sent
    if (sortKey === 'paymentRate') return paymentRateOf(mb) - paymentRateOf(ma)
    return mb.paymentCount - ma.paymentCount
  })
  return arr
}
```

- [ ] **Step 4: Trim `src/lib/formatters.ts` — remove exports that no longer have any importer**

Delete the `formatRateWithCount`, `formatWoW`, `formatWoWpp`, and `daysAgo` function bodies (each was used only by the KPI-card/attribution/performance code deleted in Task 2 — confirmed by `grep -rln "formatWoW\|formatWoWpp\|daysAgo\|formatRateWithCount" src/` showing only files already deleted, plus `formatters.ts` itself). Keep every other export (`formatNumber`, `formatKorean`, `formatRate`, `formatCountWithRate`, `formatCurrency`, `pad2`, `normalizeDate`, `formatDateShort`, `parseDateStr`, `toDateStr`, `addDays`) — all are still used by AO components/metrics.

```diff
-/** Rate 옆에 분자(원본 건수)를 괄호로 병기 — 예: "12.34% (1,234)" */
-export function formatRateWithCount(rate: number, count: number): string {
-  return `${formatRate(rate)} (${formatNumber(Math.round(count))})`
-}
-
 /** 건수 뒤에 전환율을 괄호로 병기 — 예: "1,234(12.3%)". rate는 0~1 비율 */
 export function formatCountWithRate(count: number, rate: number): string {
   return `${formatNumber(Math.round(count))}(${(rate * 100).toFixed(1)}%)`
 }

 /** 단가성 지표 전체 숫자 표기 (AOV, ARPU, ARPPU, 노출당 Rev 등) — 정수 반올림 */
 export function formatCurrency(n: number): string {
   return `₩${Math.round(n).toLocaleString('ko-KR')}`
 }

-/** WoW 변화율을 "+2.3%" 형태로 표기 */
-export function formatWoW(ratio: number): string {
-  const pct = (Math.round(ratio * 10000) / 100).toFixed(1)
-  return ratio >= 0 ? `+${pct}%` : `${pct}%`
-}
-
-/** WoW %p 변화 표기 (CTR 같은 Rate 지표) */
-export function formatWoWpp(diff: number): string {
-  const pp = (Math.round(diff * 10000) / 100).toFixed(2)
-  return diff >= 0 ? `+${pp}%p` : `${pp}%p`
-}
-
 function pad2(value: number): string {
```

```diff
-/** n일 전 날짜를 YYYY-MM-DD로 반환 */
-export function daysAgo(n: number, from?: Date): string {
-  const d = from ? new Date(from) : new Date()
-  d.setDate(d.getDate() - n)
-  return toDateStr(d)
-}
-
 /** 특정 날짜 문자열에서 n일 이동한 날짜를 YYYY-MM-DD로 반환 */
 export function addDays(dateStr: string, n: number): string {
```

- [ ] **Step 5: Rewrite `src/hooks/useSheetData.ts` — single-tenant cache, new row type**

```ts
import { useState, useEffect, useRef } from 'react'
import { fetchAoPushRows } from '@/lib/googleSheets'
import type { AoPushRow } from '@/types/sheets'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5분

interface CacheEntry {
  data: AoPushRow[]
  fetchedAt: number
}

let cache: CacheEntry | null = null
let pending: Promise<AoPushRow[]> | null = null

export interface SheetData {
  rows: AoPushRow[]
  loading: boolean
  error: string | null
  /** 전체 기간 (수신/오픈 등 모든 원본 행 기준, AO 필터 적용 전) */
  dateRange: { min: string; max: string } | null
}

export function useSheetData(): SheetData {
  const [rows, setRows] = useState<AoPushRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const now = Date.now()
        const needsFetch = !cache || now - cache.fetchedAt > CACHE_TTL_MS

        if (needsFetch && !pending) {
          pending = fetchAoPushRows().finally(() => { pending = null })
        }

        const data = needsFetch ? await pending! : cache!.data
        if (needsFetch) cache = { data, fetchedAt: Date.now() }

        if (mounted.current) setRows(data)
      } catch (err) {
        if (mounted.current) setError(err instanceof Error ? err.message : '데이터 로드 실패')
      } finally {
        if (mounted.current) setLoading(false)
      }
    }

    void load()
    return () => { mounted.current = false }
  }, [])

  // fetchAoPushRows가 날짜 오름차순으로 정렬해 반환하므로 첫/끝 원소로 min/max를 구할 수 있음
  const dateRange = rows.length > 0
    ? { min: rows[0].date, max: rows[rows.length - 1].date }
    : null

  return { rows, loading, error, dateRange }
}
```

- [ ] **Step 6: Delete `src/lib/supabase.ts`** (its only remaining importer, the old `googleSheets.ts`, was just rewritten in Step 2)

```bash
git rm src/lib/supabase.ts
```

- [ ] **Step 7: Remove `@supabase/supabase-js` from `package.json`**

```diff
-    "@supabase/supabase-js": "^2.105.3",
     "@vitejs/plugin-react": "^4.7.0",
```

Run: `NODE_ENV=development npm install --include=dev`
Expected: exits 0, `package-lock.json` drops `@supabase/supabase-js` and its transitive deps.

- [ ] **Step 8: Rewrite `src/components/charts/AoCampaignTrendChart.tsx`**

```tsx
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { AoTrendPoint } from '@/lib/metrics'
import { formatKorean, formatCurrency, formatCountWithRate } from '@/lib/formatters'
import { useChartColors } from '@/lib/chartColors'
import { SegmentedToggle } from '@/components/filters/SegmentedToggle'

interface Props {
  campaignName: string
  data: AoTrendPoint[]
  granularity: 'day' | 'week' | 'month'
  onGranularityChange: (g: 'day' | 'week' | 'month') => void
}

export function AoCampaignTrendChart({ campaignName, data, granularity, onGranularityChange }: Props) {
  const colors = useChartColors()

  return (
    <div className="rounded-xl border border-[#e0e0e0] bg-white p-5 flex flex-col h-full">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#1d1d1f]">{campaignName || '캠페인을 선택하세요'}</p>
          <p className="text-xs text-[#9CA3AF] mt-0.5">수신 · 결제건수 · 결제순매출액 추이</p>
        </div>
        <SegmentedToggle
          value={granularity}
          onChange={onGranularityChange}
          options={[
            { key: 'day', label: '일별' },
            { key: 'week', label: '주별' },
            { key: 'month', label: '월별' },
          ]}
        />
      </div>

      <div className="flex-1 min-h-0">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-[#9CA3AF]">데이터 없음</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                tickFormatter={v => formatKorean(v)}
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={v => formatKorean(v)}
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <YAxis yAxisId="revenue" hide domain={['auto', 'auto']} />
              <Tooltip
                formatter={(value: number, name: string, entry: { payload?: AoTrendPoint }) => {
                  if (name === '결제순매출액') return [formatCurrency(value), name]
                  if (name === '결제건수') {
                    const rate = entry.payload?.paymentRate ?? 0
                    return [formatCountWithRate(value, rate), name]
                  }
                  return [formatKorean(value), name]
                }}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e0e0e0' }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                formatter={(value: string) => <span style={{ color: '#6B7280' }}>{value}</span>}
              />
              <Bar
                yAxisId="left"
                dataKey="sent"
                name="수신"
                fill={colors[0]}
                opacity={0.85}
                radius={[3, 3, 0, 0]}
                maxBarSize={40}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="paymentCount"
                name="결제건수"
                stroke={colors[1]}
                strokeWidth={2}
                dot={{ r: 3, fill: colors[1] }}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="revenue"
                type="monotone"
                dataKey="netRevenue"
                name="결제순매출액"
                stroke={colors[2]}
                strokeWidth={2}
                dot={{ r: 3, fill: colors[2] }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 9: Rewrite `src/components/AoCampaignDailyTable.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { formatNumber, formatCountWithRate, formatCurrency } from '@/lib/formatters'
import { buildAoCampaignDailyRows } from '@/lib/metrics'
import type { AoPushRow } from '@/types/sheets'

interface Props {
  rows: AoPushRow[]
  campaign: string
}

const PAGE_SIZE = 14

export function AoCampaignDailyTable({ rows, campaign }: Props) {
  const [expanded, setExpanded] = useState(false)
  const daily = useMemo(() => (campaign ? buildAoCampaignDailyRows(rows, campaign) : []), [rows, campaign])
  const visible = expanded ? daily : daily.slice(0, PAGE_SIZE)
  const hiddenCount = daily.length - PAGE_SIZE

  return (
    <div className="rounded-xl border border-[#e0e0e0] bg-white">
      <div className="border-b border-[#e0e0e0] px-4 py-3">
        <p className="truncate text-sm font-semibold text-[#1d1d1f]">{campaign || '캠페인을 선택하세요'}</p>
        <p className="mt-0.5 text-[10px] text-[#9CA3AF]">일자별 실적 · 최신 날짜순</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-[#F3F4F6] bg-[#F9FAFB]">
              <th className="px-4 py-2 text-left text-[11px] font-semibold text-[#6B7280]">일자</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">수신</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">오픈</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">결제건수</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">결제회원수</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">즉차거래액</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">결제순매출액</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-xs text-[#9CA3AF]">이 기간 데이터 없음</td>
              </tr>
            ) : (
              visible.map((row, idx) => (
                <tr key={row.date} className={cn('border-b border-[#F3F4F6] hover:bg-[#F9FAFB]', idx % 2 === 1 && 'bg-[#FAFAFB]')}>
                  <td className="px-4 py-2 text-xs font-medium text-[#1d1d1f]">{row.date}</td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">{formatNumber(row.sent)}</td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">{formatCountWithRate(row.opens, row.openRate)}</td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">{formatCountWithRate(row.paymentCount, row.paymentRate)}</td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">{formatCountWithRate(row.payingMembers, row.payingMemberRate)}</td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">{formatCurrency(row.grossAmount)}</td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">{formatCurrency(row.netRevenue)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {hiddenCount > 0 && (
        <div className="border-t border-[#F3F4F6] px-4 py-2.5 text-center">
          <button onClick={() => setExpanded(v => !v)} className="text-xs font-medium text-[#0066cc] hover:underline">
            {expanded ? '접기' : `나머지 ${hiddenCount}일 더 보기`}
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 10: Rewrite `src/components/AoMonthlyPerformanceTable.tsx`** (builds on Task 2's Step 8 edit — now also renames fields and drops the Conversion C/D toggle, which has no analog in the new schema)

```tsx
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber, formatCurrency, formatCountWithRate } from '@/lib/formatters'
import { buildAoPivot, listAoYears, monthLabel, shiftYears, calcYoY, sortByAoMetric, type AoSortKey, type AoPivotRow } from '@/lib/metrics'
import { AoSortSelect } from './filters/AoSortSelect'
import type { AoPushRow } from '@/types/sheets'

interface Props {
  /** AO 캠페인으로 이미 필터링된 행 (날짜 범위 필터는 적용하지 않음 — 이 테이블은 자체 연/월 범위를 가짐) */
  rows: AoPushRow[]
}

const DEFAULT_MONTHS = 3
const COLS_PER_MONTH = 6

interface ColumnGroup {
  year: string
  /** null이면 연도가 접혀서 연간 합계 하나로 표시됨 */
  month: string | null
  label: string
}

export function AoMonthlyPerformanceTable({ rows }: Props) {
  const [sortKey, setSortKey] = useState<AoSortKey>('name')
  const [revealedYears, setRevealedYears] = useState<string[]>([])
  const [collapsedYears, setCollapsedYears] = useState<Set<string>>(new Set())
  const initialized = useRef(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const allYears = useMemo(() => listAoYears(rows), [rows])

  // 데이터가 처음 로드되면 최근 3개월이 속한 연도만 기본으로 펼침
  useEffect(() => {
    if (initialized.current || rows.length === 0) return
    initialized.current = true
    const recentMonths = [...new Set(rows.map(r => r.date.slice(0, 7)))].sort().reverse().slice(0, DEFAULT_MONTHS)
    const years = [...new Set(recentMonths.map(m => m.slice(0, 4)))].sort().reverse()
    setRevealedYears(years)
  }, [rows])

  const pivot = useMemo(() => buildAoPivot(rows, revealedYears), [rows, revealedYears])

  // 결제순매출액 YoY 배지용 — 화면에 펼쳐지지 않은 전년도라도 비교값은 항상 계산해둔다
  const comparisonYears = useMemo(
    () => [...new Set(revealedYears.flatMap(y => [y, String(Number(y) - 1)]))],
    [revealedYears],
  )
  const yoyPivot = useMemo(() => buildAoPivot(rows, comparisonYears), [rows, comparisonYears])
  const yoyByCampaign = useMemo(
    () => new Map(yoyPivot.rows.map(r => [r.campaign, r])),
    [yoyPivot],
  )

  function revenueYoY(campaign: string, g: ColumnGroup): number | null {
    const yoyRow = yoyByCampaign.get(campaign)
    if (!yoyRow) return null
    if (g.month) {
      const priorMonth = shiftYears(g.month, -1)
      return calcYoY(yoyRow.byMonth[g.month]?.netRevenue ?? 0, yoyRow.byMonth[priorMonth]?.netRevenue)
    }
    const priorYear = String(Number(g.year) - 1)
    return calcYoY(yoyRow.byYear[g.year]?.netRevenue ?? 0, yoyRow.byYear[priorYear]?.netRevenue)
  }

  const nextYear = allYears.find(y => !revealedYears.includes(y))

  function revealPreviousYear() {
    if (!nextYear) return
    setRevealedYears(prev => [...prev, nextYear].sort().reverse())
    setCollapsedYears(prev => new Set(prev).add(nextYear))
  }

  function toggleYear(year: string) {
    setCollapsedYears(prev => {
      const next = new Set(prev)
      if (next.has(year)) next.delete(year)
      else next.add(year)
      return next
    })
  }

  // 연도별로 접혀있으면 "연간 합계" 컬럼 1개, 펼쳐있으면 그 연도의 월별 컬럼들
  const columnGroups: ColumnGroup[] = pivot.years.flatMap(year => {
    if (collapsedYears.has(year)) {
      return [{ year, month: null, label: '연간 합계' }]
    }
    return pivot.monthsByYear[year].map(month => ({ year, month, label: monthLabel(month) }))
  })

  // 정렬 기준(순매출/수신/결제건수)은 현재 화면에 보이는 컬럼들의 합으로 계산
  function aggregateForSort(row: AoPivotRow) {
    let netRevenue = 0, sent = 0, paymentCount = 0
    for (const g of columnGroups) {
      const m = g.month ? row.byMonth[g.month] : row.byYear[g.year]
      if (!m) continue
      netRevenue += m.netRevenue
      sent += m.sent
      paymentCount += m.paymentCount
    }
    return { campaign: row.campaign, netRevenue, sent, paymentCount }
  }

  const sortedRows = sortByAoMetric(pivot.rows, sortKey, aggregateForSort)

  function updateScrollState() {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  // 컬럼 수가 바뀌면(연도 펼침/접힘) 스크롤 가능 여부를 다시 계산
  useEffect(() => {
    const id = requestAnimationFrame(updateScrollState)
    return () => cancelAnimationFrame(id)
  }, [columnGroups.length])

  function scrollByPage(direction: 1 | -1) {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  if (pivot.rows.length === 0) return null

  const canScrollAtAll = canScrollLeft || canScrollRight

  return (
    <div className="rounded-xl border border-[#e0e0e0] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e0e0e0] px-4 py-3">
        <div>
          <p className="text-xs font-semibold text-[#1d1d1f]">캠페인 × 월 실적표</p>
          <p className="text-[10px] text-[#9CA3AF] mt-0.5">그 달에 발송한 캠페인만 표시 · 연도 클릭 시 접기/펼치기</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <AoSortSelect value={sortKey} onChange={setSortKey} />

          {nextYear && (
            <button
              onClick={revealPreviousYear}
              className="rounded-lg border border-[#e0e0e0] bg-[#F9FAFB] px-2.5 py-1.5 text-xs font-medium text-[#6B7280] hover:text-[#1d1d1f]"
            >
              + {nextYear}년 데이터 보기
            </button>
          )}

          {canScrollAtAll && (
            <div className="flex items-center overflow-hidden rounded-lg border border-[#e0e0e0]">
              <button
                onClick={() => scrollByPage(-1)}
                disabled={!canScrollLeft}
                className="flex items-center justify-center bg-[#F9FAFB] px-1.5 py-1.5 text-[#6B7280] hover:text-[#1d1d1f] disabled:opacity-30 disabled:hover:text-[#6B7280]"
                title="왼쪽으로 스크롤"
              >
                <ChevronLeft size={14} />
              </button>
              <div className="h-4 w-px bg-[#e0e0e0]" />
              <button
                onClick={() => scrollByPage(1)}
                disabled={!canScrollRight}
                className="flex items-center justify-center bg-[#F9FAFB] px-1.5 py-1.5 text-[#6B7280] hover:text-[#1d1d1f] disabled:opacity-30 disabled:hover:text-[#6B7280]"
                title="오른쪽으로 스크롤"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div ref={scrollRef} onScroll={updateScrollState} className="overflow-x-auto">
        <table className="w-full min-w-max border-separate border-spacing-0">
          <thead>
            {/* 연도 행 — 클릭해서 접기/펼치기 */}
            <tr>
              <th className="sticky left-0 z-20 border-b border-r border-[#E5E7EB] bg-[#F3F4F6] px-4 py-1.5" />
              {pivot.years.map(year => {
                const collapsed = collapsedYears.has(year)
                const span = collapsed ? COLS_PER_MONTH : pivot.monthsByYear[year].length * COLS_PER_MONTH
                return (
                  <th
                    key={year}
                    colSpan={span}
                    className="border-b border-l border-[#E5E7EB] bg-[#F3F4F6] px-3 py-1.5 text-center"
                  >
                    <button
                      onClick={() => toggleYear(year)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#1d1d1f] hover:text-[#0066cc]"
                    >
                      {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {year}년
                    </button>
                  </th>
                )
              })}
            </tr>
            {/* 월(또는 연간 합계) 행 */}
            <tr className="bg-[#F9FAFB]">
              <th className="sticky left-0 z-20 border-b border-r border-[#E5E7EB] bg-[#F9FAFB] px-4 py-1.5" />
              {columnGroups.map(g => (
                <th
                  key={`${g.year}-${g.month ?? 'total'}`}
                  colSpan={COLS_PER_MONTH}
                  className="border-b border-l border-[#E5E7EB] px-3 py-1.5 text-center text-[11px] font-semibold text-[#1d1d1f]"
                >
                  {g.label}
                </th>
              ))}
            </tr>
            {/* 지표 행 */}
            <tr className="bg-[#F9FAFB]">
              <th className="sticky left-0 z-20 border-b border-r border-[#E5E7EB] bg-[#F9FAFB] px-4 py-1.5 text-left text-[11px] font-semibold text-[#6B7280]">
                캠페인명
              </th>
              {columnGroups.map(g => (
                <Fragment key={`${g.year}-${g.month ?? 'total'}`}>
                  <th className="border-b border-l border-[#E5E7EB] px-3 py-1.5 text-right text-[10px] font-medium text-[#9CA3AF]">수신</th>
                  <th className="border-b border-[#F3F4F6] px-3 py-1.5 text-right text-[10px] font-medium text-[#9CA3AF]">오픈</th>
                  <th className="border-b border-[#F3F4F6] px-3 py-1.5 text-right text-[10px] font-medium text-[#9CA3AF]">결제건수</th>
                  <th className="border-b border-[#F3F4F6] px-3 py-1.5 text-right text-[10px] font-medium text-[#9CA3AF]">결제회원수</th>
                  <th className="border-b border-[#F3F4F6] px-3 py-1.5 text-right text-[10px] font-medium text-[#9CA3AF]">즉차거래액</th>
                  <th className="border-b border-[#F3F4F6] px-3 py-1.5 text-right text-[10px] font-medium text-[#9CA3AF]">결제순매출액</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, idx) => (
              <tr key={row.campaign} className={cn('hover:bg-[#F3F8FF]', idx % 2 === 1 && 'bg-[#FAFAFB]')}>
                <td
                  className={cn(
                    'sticky left-0 z-10 w-[260px] max-w-[260px] whitespace-normal break-words border-b border-r border-[#E5E7EB] px-4 py-2 text-xs font-medium text-[#1d1d1f]',
                    idx % 2 === 1 ? 'bg-[#FAFAFB]' : 'bg-white',
                  )}
                >
                  {row.campaign}
                </td>
                {columnGroups.map(g => {
                  const m = g.month ? row.byMonth[g.month] : row.byYear[g.year]
                  const base = m ? m.sent : 0
                  const rate = (count: number) => (base > 0 ? count / base : 0)
                  return (
                    <Fragment key={`${g.year}-${g.month ?? 'total'}`}>
                      <td className="border-b border-l border-[#E5E7EB] px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">
                        {m ? formatNumber(m.sent) : '-'}
                      </td>
                      <td className="border-b border-[#F3F4F6] px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">
                        {m ? formatCountWithRate(m.opens, rate(m.opens)) : '-'}
                      </td>
                      <td className="border-b border-[#F3F4F6] px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">
                        {m ? formatCountWithRate(m.paymentCount, rate(m.paymentCount)) : '-'}
                      </td>
                      <td className="border-b border-[#F3F4F6] px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">
                        {m ? formatCountWithRate(m.payingMembers, rate(m.payingMembers)) : '-'}
                      </td>
                      <td className="border-b border-[#F3F4F6] px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">
                        {m ? formatCurrency(m.grossAmount) : '-'}
                      </td>
                      <td className="border-b border-[#F3F4F6] px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">
                        {m ? formatCurrency(m.netRevenue) : '-'}
                        {(() => {
                          const yoy = m ? revenueYoY(row.campaign, g) : null
                          if (yoy === null) return null
                          return (
                            <div className={cn('text-[10px] font-medium', yoy >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]')}>
                              {yoy >= 0 ? '▲' : '▼'} {Math.abs(yoy * 100).toFixed(0)}%
                            </div>
                          )
                        })()}
                      </td>
                    </Fragment>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 11: Rewrite `src/components/AoPeriodComparisonTable.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { AoSortSelect } from './filters/AoSortSelect'
import { DateField } from './filters/DateField'
import { formatNumber, formatCountWithRate, formatCurrency } from '@/lib/formatters'
import { buildAoPeriodTable, calcPeriodDelta, sortByAoMetric, type AoPeriodRow, type AoSortKey } from '@/lib/metrics'
import type { AoPushRow, DateRange } from '@/types/sheets'

interface Props {
  /** AO 캠페인으로 이미 필터링된 행 (전체 기간 — 두 비교 기간을 자유롭게 고를 수 있어야 하므로 날짜 필터는 걸지 않음) */
  rows: AoPushRow[]
  periodA: DateRange
  periodB: DateRange
  onPeriodAChange: (range: DateRange) => void
  onPeriodBChange: (range: DateRange) => void
}

const PAGE_SIZE = 10

function Leaderboard({ title, data, expanded }: { title: string; data: AoPeriodRow[]; expanded: boolean }) {
  const visible = expanded ? data : data.slice(0, PAGE_SIZE)

  return (
    <div className="flex-1 min-w-0">
      <p className="mb-2 px-1 text-xs font-semibold text-[#1d1d1f]">{title}</p>
      <div className="overflow-x-auto rounded-lg border border-[#e0e0e0]">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-[#F3F4F6] bg-[#F9FAFB]">
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-[#6B7280]">캠페인명</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">수신</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">오픈</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">결제건수</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">결제회원수</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">즉차거래액</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#6B7280]">결제순매출액</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-xs text-[#9CA3AF]">이 기간 데이터 없음</td>
              </tr>
            ) : (
              visible.map((row, idx) => (
                <tr key={row.campaign} className={cn('border-b border-[#F3F4F6] hover:bg-[#F9FAFB]', idx % 2 === 1 && 'bg-[#FAFAFB]')}>
                  <td className="max-w-[220px] whitespace-normal break-words px-3 py-2 text-xs font-medium text-[#1d1d1f]">{row.campaign}</td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">{formatNumber(row.sent)}</td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">{formatCountWithRate(row.opens, row.openRate)}</td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">{formatCountWithRate(row.paymentCount, row.paymentRate)}</td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">{formatCountWithRate(row.payingMembers, row.payingMemberRate)}</td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">{formatCurrency(row.grossAmount)}</td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums text-[#1d1d1f]">{formatCurrency(row.netRevenue)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AoPeriodComparisonTable({ rows, periodA, periodB, onPeriodAChange, onPeriodBChange }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [sortKey, setSortKey] = useState<AoSortKey>('revenue')

  const tableA = useMemo(() => buildAoPeriodTable(rows, periodA.start, periodA.end), [rows, periodA])
  const tableB = useMemo(() => buildAoPeriodTable(rows, periodB.start, periodB.end), [rows, periodB])

  const sortedA = useMemo(() => sortByAoMetric(tableA, sortKey, r => r), [tableA, sortKey])
  const sortedB = useMemo(() => sortByAoMetric(tableB, sortKey, r => r), [tableB, sortKey])

  const netRevenueA = tableA.reduce((s, r) => s + r.netRevenue, 0)
  const netRevenueB = tableB.reduce((s, r) => s + r.netRevenue, 0)
  const delta = calcPeriodDelta(netRevenueB, netRevenueA)

  const maxRows = Math.max(tableA.length, tableB.length)
  const hiddenCount = maxRows - PAGE_SIZE

  return (
    <div className="rounded-xl border border-[#e0e0e0] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e0e0e0] px-4 py-3">
        <div>
          <p className="text-xs font-semibold text-[#1d1d1f]">기간 비교</p>
          <p className="text-[10px] text-[#9CA3AF] mt-0.5">두 기간을 골라 캠페인 성과를 나란히 비교</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#6B7280]">비교 기간</span>
            <DateField value={periodA.start} onChange={v => onPeriodAChange({ ...periodA, start: v })} />
            <span className="text-[#9CA3AF]">~</span>
            <DateField value={periodA.end} onChange={v => onPeriodAChange({ ...periodA, end: v })} />
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-[#1d1d1f]">기준 기간</span>
            <DateField value={periodB.start} onChange={v => onPeriodBChange({ ...periodB, start: v })} />
            <span className="text-[#9CA3AF]">~</span>
            <DateField value={periodB.end} onChange={v => onPeriodBChange({ ...periodB, end: v })} />
          </div>
          <AoSortSelect value={sortKey} onChange={setSortKey} />
        </div>
      </div>

      {delta !== null && (
        <p className="px-4 pt-3 text-xs text-[#6B7280]">
          전체 순매출 증감{' '}
          <span className={cn('font-semibold', delta >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]')}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta * 100).toFixed(1)}%
          </span>
          <span className="text-[#9CA3AF]"> (비교 기간 대비 기준 기간)</span>
        </p>
      )}

      <div className="flex flex-col gap-4 p-4 md:flex-row">
        <Leaderboard title="비교 기간" data={sortedA} expanded={expanded} />
        <Leaderboard title="기준 기간" data={sortedB} expanded={expanded} />
      </div>

      {hiddenCount > 0 && (
        <div className="border-t border-[#F3F4F6] px-4 py-2.5 text-center">
          <button onClick={() => setExpanded(v => !v)} className="text-xs font-medium text-[#0066cc] hover:underline">
            {expanded ? '접기' : '나머지 캠페인 더 보기'}
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 12: Update `src/pages/CRMAlwaysOn.tsx`** — rename `martinee` → `rows` (the only change this file needs; `filterAoRows`/`listAoCampaignNames`/`buildAoCampaignTrend`/`previousPeriodOfSameLength` keep the exact same call signatures)

```diff
-  const { martinee, loading, error, dateRange } = useSheetData()
+  const { rows: sheetRows, loading, error, dateRange } = useSheetData()
```

```diff
-  const aoRows = useMemo(() => filterAoRows(martinee), [martinee])
+  const aoRows = useMemo(() => filterAoRows(sheetRows), [sheetRows])
```

- [ ] **Step 13: Verify the full deletion/rewrite set left no dangling references**

Run: `grep -rln "MartineeUnionRow\|DailyKpiRow\|AttDataRow\|FilterState\|lib/supabase\|@supabase/supabase-js" src/`
Expected: no output.

Run: `grep -rn "sentImpression\|conversionA\b\|conversionB\b\|conversionRateA\|conversionRateB" src/components/Ao*.tsx src/components/charts/AoCampaignTrendChart.tsx src/lib/metrics.ts`
Expected: no output (all renamed to `sent`/`paymentCount`/`payingMembers`/`paymentRate`/`payingMemberRate`).

- [ ] **Step 14: Type-check, lint, build**

Run: `NODE_ENV=development npm run type-check`
Expected: PASS.

Run: `NODE_ENV=development npm run lint`
Expected: PASS.

Run: `NODE_ENV=development npm run build`
Expected: PASS.

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "refactor(ao): rebuild data model and metrics around the 브레이즈 푸시 실적 sheet schema"
```

---

## Task 4: End-to-end verification

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Clean reinstall**

Run: `rm -rf node_modules && NODE_ENV=development npm install --include=dev`
Expected: exits 0.

- [ ] **Step 2: Full static checks**

Run: `NODE_ENV=development npm run type-check && NODE_ENV=development npm run lint && NODE_ENV=development npm run build`
Expected: all three PASS in sequence (build produces `dist/`).

- [ ] **Step 3: Confirm the deleted surface stays gone**

Run: `git ls-files | grep -iE "CRMPerformance|CRMAttribution|CRMCampaignOps|ProtectedRoute|pages/Login|pages/ProjectSelect|lib/supabase|lib/braze|supabase/chart_notes|api/_lib/auth|api/project/|api/braze/"`
Expected: no output.

- [ ] **Step 4: Manual dev-server walkthrough against the real sheet**

Ensure a local `.env` has real `SPREADSHEET_ID` / `GOOGLE_SHEETS_API_KEY`.

Run: `NODE_ENV=development npm run dev`, open the app in a browser.

Check, in order:
1. Only "AO 캠페인 모니터링" and "설정" tabs are visible; no login screen appears.
2. AO tab: the 캠페인 dropdown lists real campaign names (Korean, no `AO_BEH_NONE_iOS_PUSH_ACT_` technical prefixes); the date preset filter and calendar both work; the 캠페인별 추이 chart renders bars ("수신") + two lines ("결제건수", "결제순매출액") with a legend, and switching 그래프/테이블 shows the daily table with 7 metric columns.
3. 월별 실적 / 기간 비교 toggle both render; expanding a previous year and clicking a year header to collapse it both work; the 결제순매출액 column shows a ▲/▼ YoY badge where a prior-year comparison exists.
4. 설정 tab shows only 차트 색상 (no Braze section, no Google Sheets connection fields, no 프로젝트 section, no 대시보드 레이아웃 section); changing a color updates the AO trend chart's bar/line colors live; reloading the page keeps the changed colors (localStorage persistence).
5. Open the browser Network tab and confirm `/api/sheets?sheet=%EB%B8%8C...` (or via `curl` as in Task 1 Step 6) returns data and that no request is ever sent with an `Authorization` header or `X-Project-Id` header.

Stop the dev server once all five checks pass.

- [ ] **Step 5: Final commit (only if Step 4 surfaced fixes)**

If Step 4 required any code changes, stage and commit them with a message describing the fix; otherwise this task produces no commit (verification-only).

---

## Self-Review Notes

- **Spec coverage:** Req 1 (AO+Settings only, `Tab` narrowed) → Tasks 2–3. Req 2 (Settings trimmed to chart colors only, decision made explicit) → Task 2 Step 7. Req 3 (new sheet/columns/parsing/AO_ prefix filter/scale) → Task 3 Steps 1–2, Global Constraints. Req 4 (new types+metrics, 4 components updated, no 5th parallel model) → Task 3 Steps 3, 8–12. Req 5 (Supabase fully removed, chart colors decision) → Tasks 2–3 (deletions + `useChartColorsState`). Req 6 (proxy vs direct decision, env vars renamed) → Task 1.
- **Placeholder scan:** every step above either runs a real, copy-pasteable shell command or contains complete file content / a concrete diff hunk — no "TODO", "add validation", or "similar to Task N" language appears anywhere in this plan.
- **Type consistency:** `AoPushRow` fields (`sent`, `opens`, `openRate`, `paymentCount`, `payingMembers`, `conversionRate`, `grossAmount`, `netRevenue`) are defined once in Task 3 Step 1 and used with identical names in Steps 2–12. `AoTrendPoint`, `AoDailyRow`, `AoMonthlyMetrics`, `AoPeriodRow`, `AoSortKey`, `AO_SORT_OPTIONS` are each defined exactly once (Task 3 Step 3) and consumed with matching field names in Steps 8–11. `useSheetData()`'s return shape (`rows`/`loading`/`error`/`dateRange`) is defined in Task 3 Step 5 and consumed with that exact shape in Step 12. `useChartColorsState()`'s return shape (`colors`/`updateColor`/`addColor`/`removeColor`) is defined in Task 2 Step 4 and consumed identically in Task 2 Step 7 and Task 3's `App.tsx` (from Task 2 Step 5).
