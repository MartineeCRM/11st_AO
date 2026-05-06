# Trigger Mapping Manual Override Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to manually assign trigger names to Action-Based campaigns that have no `trigger_action` from Braze API, stored per-project in Supabase.

**Architecture:** Add `trigger_mappings JSONB` column to `projects` table. `useProject` exposes the mappings and a save function. `TriggerEventCards` uses mappings as fallback, shows a pencil button on the unknown group, opens `TriggerMappingModal` for editing.

**Tech Stack:** React, TypeScript, Supabase, Tailwind CSS, Recharts (none for this feature)

---

### Task 1: Supabase — add `trigger_mappings` column

**Files:**
- No file to create; run SQL in Supabase dashboard or migration

- [ ] **Step 1: Run the migration SQL**

In Supabase SQL editor (or a migration file), run:

```sql
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS trigger_mappings JSONB NOT NULL DEFAULT '{}';
```

- [ ] **Step 2: Verify column exists**

In Supabase Table Editor, open `projects` table and confirm `trigger_mappings` column is present with default `{}`.

- [ ] **Step 3: Commit a migration note**

```bash
git commit --allow-empty -m "feat: add trigger_mappings column to projects (applied in Supabase)"
```

---

### Task 2: Update `Project` type and `useProject` hook

**Files:**
- Modify: `src/lib/supabase.ts`
- Modify: `src/hooks/useProject.ts`

- [ ] **Step 1: Add `trigger_mappings` to `Project` interface in `src/lib/supabase.ts`**

Replace the existing `Project` interface:

```ts
export interface Project {
  id: string
  name: string
  spreadsheet_id: string
  chart_colors: string[]
  metric_definitions: { col: string; label: string }[]
  trigger_mappings: Record<string, string>
}
```

- [ ] **Step 2: Include `trigger_mappings` in the Supabase select query in `src/hooks/useProject.ts`**

Find the line:
```ts
.select('id, name, chart_colors, metric_definitions, spreadsheet_id')
```
Change it to:
```ts
.select('id, name, chart_colors, metric_definitions, spreadsheet_id, trigger_mappings')
```

- [ ] **Step 3: Add `saveTriggerMappings` to the hook's return type and implementation**

At the top of `useProject.ts`, after the `ProjectState` interface, add `saveTriggerMappings` to the interface:

```ts
interface ProjectState {
  project: Project | null
  projectId: string | null
  loading: boolean
  error: string | null
  availableProjects: Project[]
  setProjectId: (id: string) => void
  saveTriggerMappings: (mappings: Record<string, string>) => Promise<void>
}
```

Inside `useProject`, add the function before `return`:

```ts
async function saveTriggerMappings(mappings: Record<string, string>) {
  if (!project) return
  const { error } = await supabase
    .from('projects')
    .update({ trigger_mappings: mappings })
    .eq('id', project.id)
  if (error) throw new Error(error.message)
  // Update local state immediately
  setProject(prev => prev ? { ...prev, trigger_mappings: mappings } : prev)
  setAvailableProjects(prev =>
    prev.map(p => p.id === project.id ? { ...p, trigger_mappings: mappings } : p)
  )
}
```

Update the return statement to include it:

```ts
return { project, projectId, loading, error, availableProjects, setProjectId, saveTriggerMappings }
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
NODE_ENV=development npm run type-check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase.ts src/hooks/useProject.ts
git commit -m "feat: add trigger_mappings to Project type and useProject hook"
```

---

### Task 3: Create `TriggerMappingModal` component

**Files:**
- Create: `src/components/TriggerMappingModal.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState } from 'react'
import { X } from 'lucide-react'
import type { EnrichedCampaign } from '@/hooks/useBrazeCampaigns'
import { channelLabel, channelBadgeColor } from '@/lib/braze'

interface Props {
  campaigns: EnrichedCampaign[]          // unmapped campaigns only
  existingTriggers: string[]             // already-known trigger names for suggestions
  savedMappings: Record<string, string>  // current saved state
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
    // Only include entries with non-empty values
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-sm font-semibold text-[#111827]">트리거 이름 수동 매핑</h2>
            <p className="text-xs text-[#9CA3AF] mt-0.5">미매핑 캠페인에 트리거 이름을 지정합니다.</p>
          </div>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#374151] p-1 rounded">
            <X size={16} />
          </button>
        </div>

        {/* Campaign list */}
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
                <span className="flex-1 text-xs text-[#374151] truncate" title={c.name}>{c.name}</span>
                <div className="relative shrink-0 w-36">
                  <input
                    type="text"
                    list={`triggers-${c.id}`}
                    value={draft[c.id] ?? ''}
                    onChange={e => setMapping(c.id, e.target.value)}
                    placeholder="트리거 이름 입력..."
                    className="w-full rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-xs text-[#374151] focus:border-[#4361EE] focus:outline-none"
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

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#E5E7EB] bg-[#F9FAFB]">
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
              className="rounded-lg bg-[#374151] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#111827] disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
NODE_ENV=development npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/TriggerMappingModal.tsx
git commit -m "feat: add TriggerMappingModal component"
```

---

### Task 4: Update `TriggerEventCards` to use mappings and open modal

**Files:**
- Modify: `src/components/TriggerEventCards.tsx`

- [ ] **Step 1: Rewrite `TriggerEventCards.tsx`**

Replace the entire file with:

```tsx
import { useState } from 'react'
import { ExternalLink, Pencil } from 'lucide-react'
import type { EnrichedCampaign } from '@/hooks/useBrazeCampaigns'
import { channelLabel, channelBadgeColor, brazeCampaignUrl } from '@/lib/braze'
import { TriggerMappingModal } from '@/components/TriggerMappingModal'

interface Props {
  campaigns: EnrichedCampaign[]
  loading: boolean
  error: string | null
  triggerMappings: Record<string, string>
  onSaveMappings: (mappings: Record<string, string>) => Promise<void>
}

interface TriggerGroup {
  triggerAction: string
  campaigns: EnrichedCampaign[]
  isUnknown: boolean
}

const UNKNOWN_KEY = '(알 수 없는 트리거)'

function groupByTrigger(
  campaigns: EnrichedCampaign[],
  triggerMappings: Record<string, string>,
): TriggerGroup[] {
  const actionBased = campaigns.filter(c => c.schedule_type === 'action_based')
  const map = new Map<string, EnrichedCampaign[]>()
  for (const c of actionBased) {
    const key = c.trigger_action || triggerMappings[c.id] || UNKNOWN_KEY
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(c)
  }
  return Array.from(map.entries())
    .sort((a, b) => {
      if (a[0] === UNKNOWN_KEY) return 1
      if (b[0] === UNKNOWN_KEY) return -1
      return b[1].length - a[1].length
    })
    .map(([triggerAction, campaigns]) => ({
      triggerAction,
      campaigns,
      isUnknown: triggerAction === UNKNOWN_KEY,
    }))
}

const TRIGGER_COLORS = [
  '#4361EE', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#06B6D4', '#F97316', '#EC4899',
]

export function TriggerEventCards({ campaigns, loading, error, triggerMappings, onSaveMappings }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const groups = groupByTrigger(campaigns, triggerMappings)
  const unknownGroup = groups.find(g => g.isUnknown)
  const knownTriggers = groups.filter(g => !g.isUnknown).map(g => g.triggerAction)

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white">
      <div className="flex items-center gap-2.5 px-6 py-3.5 border-b border-[#F3F4F6]">
        <span className="text-sm font-semibold text-[#111827]">Action-Based 트리거 이벤트 현황</span>
        {!loading && (
          <span className="text-xs text-[#9CA3AF]">{groups.length}개 트리거</span>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-sm text-[#9CA3AF]">
          <span className="animate-spin mr-2">⟳</span> 트리거 이벤트 분석 중...
        </div>
      )}
      {error && (
        <div className="px-6 py-8 text-sm text-[#EF4444]">오류: {error}</div>
      )}
      {!loading && !error && groups.length === 0 && (
        <div className="py-12 text-center text-[#9CA3AF] text-sm">
          Action-Based 캠페인이 없습니다.
        </div>
      )}

      {!loading && !error && groups.length > 0 && (
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group, idx) => {
            const color = group.isUnknown ? '#9CA3AF' : TRIGGER_COLORS[idx % TRIGGER_COLORS.length]
            return (
              <div
                key={group.triggerAction}
                className="rounded-lg border border-[#E5E7EB] overflow-hidden"
                style={{ borderLeftColor: color, borderLeftWidth: 3 }}
              >
                {/* 그룹 헤더 */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#F9FAFB] border-b border-[#F3F4F6]">
                  <span className="text-[13px] font-semibold text-[#111827] truncate pr-2">
                    {group.triggerAction}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {group.isUnknown && (
                      <button
                        onClick={() => setModalOpen(true)}
                        className="rounded p-0.5 text-[#9CA3AF] hover:text-[#374151] hover:bg-[#E5E7EB]"
                        title="트리거 이름 수동 매핑"
                      >
                        <Pencil size={12} />
                      </button>
                    )}
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                      style={{ background: `${color}18`, color }}
                    >
                      {group.campaigns.length}개
                    </span>
                  </div>
                </div>

                {/* 캠페인 목록 */}
                <div className="divide-y divide-[#F9FAFB] max-h-64 overflow-y-auto">
                  {group.campaigns.map(c => {
                    const ch = c.channels[0] ?? 'unknown'
                    const badge = channelBadgeColor(ch)
                    return (
                      <div key={c.id} className="flex items-center gap-2 px-4 py-2.5 hover:bg-[#FAFAFA]">
                        <span
                          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{ background: badge.bg, color: badge.text }}
                        >
                          {channelLabel(ch)}
                        </span>
                        <span className="flex-1 text-xs text-[#374151] truncate">{c.name}</span>
                        <a
                          href={brazeCampaignUrl(c.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-[#9CA3AF] hover:text-[#4361EE] transition-colors"
                          title="Braze에서 열기"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && unknownGroup && (
        <TriggerMappingModal
          campaigns={unknownGroup.campaigns}
          existingTriggers={knownTriggers}
          savedMappings={triggerMappings}
          onSave={onSaveMappings}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
NODE_ENV=development npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/TriggerEventCards.tsx
git commit -m "feat: apply trigger mappings in TriggerEventCards, add mapping modal button"
```

---

### Task 5: Wire everything up in `CRMCampaignOps`

**Files:**
- Modify: `src/pages/CRMCampaignOps.tsx`

- [ ] **Step 1: Update `CRMCampaignOps.tsx` to pass mappings props**

Replace the entire file:

```tsx
import { useMemo } from 'react'
import { useSheetData } from '@/hooks/useSheetData'
import { useBrazeCampaigns } from '@/hooks/useBrazeCampaigns'
import { useProject } from '@/hooks/useProject'
import { useAuth } from '@/hooks/useAuth'
import { SendOpenTrendChart } from '@/components/charts/SendOpenTrendChart'
import { LiveCampaignTable } from '@/components/LiveCampaignTable'
import { TriggerEventCards } from '@/components/TriggerEventCards'
import { ScheduledCampaignList } from '@/components/ScheduledCampaignList'
import { buildDailyComboData } from '@/lib/metrics'

export function CRMCampaignOps() {
  const { user } = useAuth()
  const { project, saveTriggerMappings } = useProject(user?.id ?? null)
  const { martinee, loading: sheetLoading } = useSheetData()
  const { campaigns, loading: brazeLoading, error: brazeError } = useBrazeCampaigns()

  const trendData = useMemo(
    () => (sheetLoading ? [] : buildDailyComboData(martinee, 30)),
    [martinee, sheetLoading],
  )

  const triggerMappings = project?.trigger_mappings ?? {}

  return (
    <div className="flex flex-col gap-5 px-6 py-5">
      {/* Row 1: 발송량 & 반응 트렌드 */}
      <div className="h-72">
        {sheetLoading ? (
          <div className="h-full rounded-xl border border-[#E5E7EB] bg-[#F3F4F6] animate-pulse" />
        ) : (
          <SendOpenTrendChart data={trendData} />
        )}
      </div>

      {/* Row 2: 라이브 캠페인 현황 */}
      <LiveCampaignTable
        campaigns={campaigns}
        loading={brazeLoading}
        error={brazeError}
      />

      {/* Row 3: Action-Based 트리거 이벤트 현황 */}
      <TriggerEventCards
        campaigns={campaigns}
        loading={brazeLoading}
        error={brazeError}
        triggerMappings={triggerMappings}
        onSaveMappings={saveTriggerMappings}
      />

      {/* Row 4: Scheduled 캠페인 현황 */}
      <ScheduledCampaignList
        campaigns={campaigns}
        loading={brazeLoading}
        error={brazeError}
      />
    </div>
  )
}
```

- [ ] **Step 2: Check what `useAuth` export looks like**

```bash
grep -n "export" /Users/gunheelee/crm_dashboard/src/hooks/useAuth.ts | head -10
```

If `useAuth` is not available or exports differently, adjust the import accordingly — the goal is to get `user?.id`. If the app already has a different pattern (e.g., `useUser`), use that instead.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
NODE_ENV=development npm run type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/CRMCampaignOps.tsx
git commit -m "feat: wire trigger mappings through CRMCampaignOps"
```

---

### Task 6: Manual smoke test

- [ ] **Step 1: Start dev server**

```bash
NODE_ENV=development npm run dev
```

- [ ] **Step 2: Navigate to CRM 운영 관리 tab**

Open `http://localhost:5173`, go to CRM 운영 관리 탭.

- [ ] **Step 3: Verify unknown group shows pencil icon**

If there are Action-Based campaigns with no trigger action, `(알 수 없는 트리거)` group should show a pencil icon in the header.

- [ ] **Step 4: Open modal and assign trigger names**

Click pencil → modal opens with campaign list. Type a trigger name (or pick from datalist if known triggers exist). Click 저장.

- [ ] **Step 5: Verify campaigns moved to correct group**

After saving, the campaigns should appear under the named trigger group instead of `(알 수 없는 트리거)`.

- [ ] **Step 6: Reload page and verify persistence**

Refresh browser. Campaigns should still be in the named group (loaded from Supabase).

- [ ] **Step 7: Final commit if any fixes were needed**

```bash
git add -p
git commit -m "fix: trigger mapping smoke test fixes"
```
