# 캠페인별 추이 — 캠페인/베리언트 단위 분리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AO 탭 "캠페인별 추이" 섹션에서 캠페인(`캠페인명_분할`)과 베리언트(`배리언트명_분할`)를 별도 드롭다운으로 골라, 캠페인 전체 합산("전체") 또는 특정 베리언트만 볼 수 있게 한다.

**Architecture:** 선택 상태를 문자열 하나(`selectedCampaign`) 대신 `{ campaign: string, variant: string | null }` 객체(`AoCampaignSelection`)로 관리한다. `lib/metrics.ts`에 캠페인 단위 집계 함수 3개를 추가하고, 추이 관련 집계 함수 2개의 매칭 기준을 이 객체 기반으로 바꾼다. 드롭다운은 기존 `CampaignSelectFilter` 컴포넌트를 옵션만 다르게 줘서 두 번 재사용한다. 메모는 베리언트와 무관하게 캠페인 기준으로만 키를 바꾼다.

**Tech Stack:** 기존 스택 그대로(React + TypeScript), 신규 의존성 없음. 프론트엔드 전용 변경 — 백엔드(`api/`) 무관.

## Global Constraints

- 적용 범위는 AO 탭 "캠페인별 추이" 섹션(차트+일별 테이블)만. 월별 실적표(`AoMonthlyPerformanceTable`/`buildAoPivot`), 주의 필요 알림(`AoAlertBanner`/`buildAoCampaignAlerts`)은 베리언트 단위 그대로 — 건드리지 않는다.
- 메모(`campaignNotes`)는 베리언트 선택과 무관하게 **캠페인(`selection.campaign`)만** 키로 쓴다. 베리언트별 메모는 지원하지 않는다(의도된 범위 밖).
- 캠페인(드롭다운 1)을 바꾸면 베리언트(드롭다운 2)는 항상 "전체"(`variant: null`)로 리셋한다.
- 드롭다운 1 정렬: 모니터링 대상 베리언트가 하나라도 있는 캠페인을 최상단 우선(그 외 가나다순). 드롭다운 2 정렬: "전체" 항상 최상단 고정, 그 아래는 기존처럼 모니터링 대상 우선 + 가나다순.
- 표시 라벨: 베리언트가 "전체"면 `"{campaign} (전체)"`, 특정 베리언트면 `"{campaign} · {variant}"` (기존과 동일한 구분자 `" · "`).
- 이 프로젝트는 자동화 테스트가 없다 — `npm run type-check` + 브라우저 수동 확인으로 검증한다.
- `NODE_ENV=production`이 고정된 환경이라 스크립트 실행 시 `NODE_ENV=development` 접두사가 필요하다(이번 태스크는 새 의존성 설치가 없어서 `npm install` 자체는 안 씀).
- 커밋 메시지에 `Co-Authored-By` 태그를 넣지 않는다 — Vercel Hobby 배포가 막힌다.

참고 스펙: `docs/superpowers/specs/2026-10-01-campaign-variant-trend-view-design.md`

---

## File Structure

| 파일 | 상태 | 역할 |
|---|---|---|
| `src/lib/metrics.ts` | 수정 | `AoCampaignSelection` 타입, `listAoCampaignGroups`/`listAoCampaignVariants`/`campaignGroupsOf` 추가, `buildAoCampaignTrend`/`buildAoCampaignDailyRows` 시그니처 변경 |
| `src/components/AoCampaignDailyTable.tsx` | 수정 | `campaign: string` prop → `selection: AoCampaignSelection` + `label: string`으로 교체 |
| `src/pages/CRMAlwaysOn.tsx` | 수정 | 선택 상태를 `AoCampaignSelection`으로 변경, 드롭다운 2개로 분리, 메모 키를 캠페인 기준으로 변경 |
| `src/App.tsx` | 수정 | `CRMAlwaysOn`에 더 이상 안 쓰는 `campaignOptions` prop 제거(`CRMSettings`에는 그대로 유지) |

---

### Task 1: 캠페인/베리언트 2단 드롭다운 + 집계 로직

**Files:**
- Modify: `src/lib/metrics.ts`
- Modify: `src/components/AoCampaignDailyTable.tsx`
- Modify: `src/pages/CRMAlwaysOn.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces (다른 파일이 그대로 가져다 씀):
  - `export interface AoCampaignSelection { campaign: string; variant: string | null }`
  - `export function listAoCampaignGroups(rows: AoPushRow[]): string[]`
  - `export function listAoCampaignVariants(rows: AoPushRow[], campaign: string): string[]`
  - `export function campaignGroupsOf(rows: AoPushRow[], monitoredVariantKeys: string[]): string[]`
  - `export function buildAoCampaignTrend(rows: AoPushRow[], selection: AoCampaignSelection, granularity: 'day' | 'week' | 'month'): AoTrendPoint[]` (기존 시그니처에서 두 번째 인자만 `string` → `AoCampaignSelection`)
  - `export function buildAoCampaignDailyRows(rows: AoPushRow[], selection: AoCampaignSelection): AoDailyRow[]` (동일)

- [ ] **Step 1: `lib/metrics.ts`에 선택 타입 + 캠페인 단위 집계 함수 추가**

`listAoCampaignNames` 함수(현재 21-28행) 바로 아래에 추가:

```ts
export interface AoCampaignSelection {
  campaign: string
  variant: string | null
}

function matchesSelection(r: AoPushRow, selection: AoCampaignSelection): boolean {
  if (r.campaignSplit !== selection.campaign) return false
  return selection.variant === null || r.variantSplit === selection.variant
}

/** AO 캠페인 목록 (캠페인명_분할 기준만, 베리언트 구분 없이), 가나다순 */
export function listAoCampaignGroups(rows: AoPushRow[]): string[] {
  const names = new Set<string>()
  for (const r of rows) {
    if (r.campaignSplit) names.add(r.campaignSplit)
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'ko'))
}

/** 주어진 캠페인(캠페인명_분할)에 속한 배리언트명_분할 목록(빈 값 제외), 가나다순 */
export function listAoCampaignVariants(rows: AoPushRow[], campaign: string): string[] {
  const names = new Set<string>()
  for (const r of rows) {
    if (r.campaignSplit === campaign && r.variantSplit) names.add(r.variantSplit)
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'ko'))
}

/** 모니터링 대상(베리언트 단위) 목록에서, 그 베리언트들이 속한 캠페인명_분할 집합을 구함 */
export function campaignGroupsOf(rows: AoPushRow[], monitoredVariantKeys: string[]): string[] {
  const monitoredSet = new Set(monitoredVariantKeys)
  const groups = new Set<string>()
  for (const r of rows) {
    if (r.campaignSplit && monitoredSet.has(aoCampaignKey(r))) {
      groups.add(r.campaignSplit)
    }
  }
  return [...groups]
}
```

- [ ] **Step 2: `buildAoCampaignTrend` 시그니처 변경**

현재:
```ts
export function buildAoCampaignTrend(
  rows: AoPushRow[],
  campaign: string,
  granularity: 'day' | 'week' | 'month',
): AoTrendPoint[] {
  const campaignRows = rows.filter(r => aoCampaignKey(r) === campaign)
```

아래로 교체 (함수 본문의 나머지 부분, `byPeriod` 계산 이후는 그대로 유지):
```ts
export function buildAoCampaignTrend(
  rows: AoPushRow[],
  selection: AoCampaignSelection,
  granularity: 'day' | 'week' | 'month',
): AoTrendPoint[] {
  const campaignRows = rows.filter(r => matchesSelection(r, selection))
```

- [ ] **Step 3: `buildAoCampaignDailyRows` 시그니처 변경**

현재:
```ts
export function buildAoCampaignDailyRows(rows: AoPushRow[], campaign: string): AoDailyRow[] {
  const campaignRows = rows.filter(r => aoCampaignKey(r) === campaign)
```

아래로 교체 (나머지 본문은 그대로 유지):
```ts
export function buildAoCampaignDailyRows(rows: AoPushRow[], selection: AoCampaignSelection): AoDailyRow[] {
  const campaignRows = rows.filter(r => matchesSelection(r, selection))
```

- [ ] **Step 4: `AoCampaignDailyTable.tsx` 수정**

`interface Props`를 아래로 교체:
```ts
interface Props {
  rows: AoPushRow[]
  selection: AoCampaignSelection
  label: string
}
```

import 줄에 `AoCampaignSelection` 타입 추가:
```ts
import { buildAoCampaignDailyRows, type AoCampaignSelection } from '@/lib/metrics'
```

컴포넌트 함수 시그니처와 내부 로직 수정:
```ts
export function AoCampaignDailyTable({ rows, selection, label }: Props) {
  const [expanded, setExpanded] = useState(false)
  const daily = useMemo(() => (selection.campaign ? buildAoCampaignDailyRows(rows, selection) : []), [rows, selection])
```

헤더의 표시 텍스트를 `campaign` → `label`로 교체:
```ts
<p className="truncate text-sm font-semibold text-[#1d1d1f]">{label || '캠페인을 선택하세요'}</p>
```

- [ ] **Step 5: `CRMAlwaysOn.tsx` — import 및 선택 상태 변경**

import 줄 수정 (기존 `buildAoCampaignTrend, buildAoCampaignAlerts, previousPeriodOfSameLength`에 추가):
```ts
import {
  buildAoCampaignTrend,
  buildAoCampaignAlerts,
  previousPeriodOfSameLength,
  listAoCampaignGroups,
  listAoCampaignVariants,
  campaignGroupsOf,
  type AoCampaignSelection,
} from '@/lib/metrics'
```

`const [selectedCampaign, setSelectedCampaign] = useState('')`를 아래로 교체:
```ts
const [selection, setSelection] = useState<AoCampaignSelection>({ campaign: '', variant: null })
```

바로 아래 노트 동기화 `useEffect`를 아래로 교체:
```ts
useEffect(() => {
  setNoteDraft(campaignNotes.notes[selection.campaign] ?? '')
}, [selection.campaign, campaignNotes.notes])
```

- [ ] **Step 6: `CRMAlwaysOn.tsx` — 캠페인/베리언트 목록 + 기본값 선택 로직 교체**

기존 블록(`// 설정 탭에서 고른 모니터링 대상 캠페인을 드롭다운 맨 위로...` 주석부터 `}, [sortedCampaignOptions])`까지)을 아래로 교체:

```ts
// 캠페인(캠페인명_분할) 목록. 모니터링 대상 베리언트가 하나라도 있는 캠페인을 드롭다운 맨 위로
// (각 그룹 내에서는 가나다순 유지) — 기존 베리언트 단위 정렬 원칙을 캠페인 단위로 확장
const campaignGroups = useMemo(() => listAoCampaignGroups(aoRows), [aoRows])

const monitoredCampaignGroups = useMemo(
  () => campaignGroupsOf(aoRows, monitoredCampaigns),
  [aoRows, monitoredCampaigns],
)

const sortedCampaignGroups = useMemo(() => {
  const monitoredSet = new Set(monitoredCampaignGroups)
  const monitored = campaignGroups.filter(c => monitoredSet.has(c))
  const rest = campaignGroups.filter(c => !monitoredSet.has(c))
  return [...monitored, ...rest]
}, [campaignGroups, monitoredCampaignGroups])

// 캠페인 목록 로드 후 기본값(모니터링 대상 우선, 그다음 가나다순 첫 캠페인) 선택, 베리언트는 항상 "전체"
useEffect(() => {
  if (!selection.campaign && sortedCampaignGroups.length > 0) {
    setSelection({ campaign: sortedCampaignGroups[0], variant: null })
  }
}, [sortedCampaignGroups]) // eslint-disable-line react-hooks/exhaustive-deps

// 선택된 캠페인에 속한 베리언트 목록 ("전체"는 드롭다운에 넘길 때 맨 앞에 추가)
const campaignVariants = useMemo(
  () => listAoCampaignVariants(aoRows, selection.campaign),
  [aoRows, selection.campaign],
)

// 표시 라벨: 전체면 "캠페인명 (전체)", 특정 베리언트면 "캠페인명 · 베리언트명"
const selectionLabel = selection.campaign
  ? selection.variant
    ? `${selection.campaign} · ${selection.variant}`
    : `${selection.campaign} (전체)`
  : ''
```

- [ ] **Step 7: `CRMAlwaysOn.tsx` — `trendData` 계산 교체**

기존:
```ts
const trendData = useMemo(
  () => (selectedCampaign ? buildAoCampaignTrend(trendSourceRows, selectedCampaign, granularity) : []),
  [trendSourceRows, selectedCampaign, granularity],
)
```

아래로 교체:
```ts
const trendData = useMemo(
  () => (selection.campaign ? buildAoCampaignTrend(trendSourceRows, selection, granularity) : []),
  [trendSourceRows, selection, granularity],
)
```

- [ ] **Step 8: `CRMAlwaysOn.tsx` — 드롭다운 JSX 2개로 분리**

기존 단일 `<CampaignSelectFilter label="캠페인" .../>` 블록을 아래로 교체:

```tsx
<CampaignSelectFilter
  label="캠페인"
  options={sortedCampaignGroups}
  selected={selection.campaign}
  onChange={campaign => setSelection({ campaign, variant: null })}
  monitoredCampaigns={monitoredCampaignGroups}
/>

<CampaignSelectFilter
  label="베리언트"
  options={['전체', ...campaignVariants]}
  selected={selection.variant ?? '전체'}
  onChange={variant => setSelection(prev => ({ ...prev, variant: variant === '전체' ? null : variant }))}
  monitoredCampaigns={monitoredCampaigns}
/>
```

- [ ] **Step 9: `CRMAlwaysOn.tsx` — 메모 textarea의 `selectedCampaign` 참조를 `selection.campaign`으로 교체**

메모 블록 안의 `selectedCampaign` 참조를 전부(블러 핸들러 조건문 2곳, `saveNote` 호출 1곳, `saveStatus` 조회 2곳 — 총 5곳 참조 + `noteDraft` 비교 1곳) `selection.campaign`으로 교체 — 블록 전체를 아래 내용으로 통째로 바꾸는 게 제일 정확함:

```tsx
<div className="flex flex-col gap-1">
  <textarea
    value={noteDraft}
    onChange={e => setNoteDraft(e.target.value)}
    onBlur={() => {
      if (
        selection.campaign &&
        (noteDraft !== (campaignNotes.notes[selection.campaign] ?? '') ||
          campaignNotes.saveStatus[selection.campaign] === 'error')
      ) {
        campaignNotes.saveNote(selection.campaign, noteDraft)
      }
    }}
    placeholder="이 캠페인 특이사항 메모..."
    rows={2}
    className="w-full resize-none rounded-lg border border-[#e0e0e0] px-3 py-2 text-xs text-[#1d1d1f] outline-none focus:border-[#0066cc]"
  />
  {campaignNotes.saveStatus[selection.campaign] === 'saved' && (
    <span className="text-[11px] text-[#9CA3AF]">저장됨</span>
  )}
  {campaignNotes.saveStatus[selection.campaign] === 'error' && (
    <span className="text-[11px] text-[#EF4444]">저장 실패, 다시 시도</span>
  )}
</div>
```

- [ ] **Step 10: `CRMAlwaysOn.tsx` — 차트/일별 테이블 부분 교체**

기존:
```tsx
{trendView === 'chart' ? (
  <div className="h-80">
    <AoCampaignTrendChart
      campaignName={selectedCampaign}
      data={trendData}
      granularity={granularity}
      onGranularityChange={setGranularity}
    />
  </div>
) : (
  <AoCampaignDailyTable rows={trendSourceRows} campaign={selectedCampaign} />
)}
```

아래로 교체:
```tsx
{trendView === 'chart' ? (
  <div className="h-80">
    <AoCampaignTrendChart
      campaignName={selectionLabel}
      data={trendData}
      granularity={granularity}
      onGranularityChange={setGranularity}
    />
  </div>
) : (
  <AoCampaignDailyTable rows={trendSourceRows} selection={selection} label={selectionLabel} />
)}
```

- [ ] **Step 11: `CRMAlwaysOn.tsx` — 이제 안 쓰는 `campaignOptions` prop 제거**

`Props` 인터페이스에서 `campaignOptions: string[]` 줄 삭제, 컴포넌트 구조분해 매개변수에서도 `campaignOptions` 제거:
```ts
export function CRMAlwaysOn({ sheetData, aoRows, monitoredCampaigns, campaignNotes }: Props) {
```

- [ ] **Step 12: `App.tsx` — `CRMAlwaysOn`에 넘기던 `campaignOptions` prop 제거**

`<CRMAlwaysOn ... />` 호출부에서 `campaignOptions={campaignOptions}` 줄만 삭제 (바로 아래 `<CRMSettings .../>` 호출부의 `campaignOptions={campaignOptions}`는 그대로 둔다 — 설정 탭은 계속 베리언트 단위 목록이 필요함).

- [ ] **Step 13: 타입 체크 + 린트**

```bash
NODE_ENV=development npm run type-check
NODE_ENV=development npm run lint
```

Expected: 둘 다 에러 없음.

- [ ] **Step 14: 브라우저 수동 확인**

```bash
NODE_ENV=development npm run dev &
sleep 2
```

내장 브라우저로 `http://localhost:5173` 열어서:
1. AO 탭 → 베리언트가 여러 개인 캠페인(예: 스펙 예시의 "검색 상품 구매 유도-ver2" 같은, `배리언트명_분할`이 서로 다른 행이 여러 개 있는 캠페인)을 드롭다운 1에서 선택 → 드롭다운 2가 "전체"로 기본 설정되는지 확인
2. 드롭다운 2에서 특정 베리언트 선택 → 차트/테이블 숫자가 그 베리언트 행만 반영하는지 확인 (베리언트 종류가 안 보이면 다른 캠페인으로 바꿔가며 베리언트 2개 이상인 캠페인을 찾을 것)
3. 다시 "전체"로 바꿈 → 그 캠페인의 모든 베리언트 합산 숫자로 바뀌는지 확인
4. 메모에 텍스트 입력 → "전체"와 특정 베리언트를 오가도 같은 메모 내용이 유지되는지 확인 (저장은 로컬 환경에 Google 서비스 계정이 없으면 "저장 실패"가 뜨는 게 정상 — 메모 *내용이 안 바뀌는지*만 확인하면 됨)
5. 다른 캠페인으로 전환 → 베리언트 드롭다운이 "전체"로 리셋되고, 메모 내용도 그 캠페인 것으로 바뀌는지 확인
6. "그래프 ↔ 테이블" 토글도 전체/베리언트 양쪽에서 정상 동작하는지 확인

```bash
pkill -f "vite" || true
```

- [ ] **Step 15: Commit**

```bash
git add src/lib/metrics.ts src/components/AoCampaignDailyTable.tsx src/pages/CRMAlwaysOn.tsx src/App.tsx
git commit -m "feat(ao): split campaign trend view into campaign + variant dropdowns"
```

---

## Self-Review Notes

- **스펙 커버리지**: 2단 드롭다운(캠페인/베리언트) → Step 6, 8. "전체" 시 캠페인 합산 → Step 2의 `matchesSelection`. 캠페인 전환 시 베리언트 "전체" 리셋 → Step 6의 기본값 로직(캠페인이 바뀌면 `setSelection({ campaign, variant: null })`으로 항상 재설정, 드롭다운 1의 `onChange`도 동일). 표시 라벨 규칙 → Step 6의 `selectionLabel`. 메모는 캠페인 단위만 → Step 5, 9. 월별 실적표/알림 배너 미변경 → 이 플랜에서 해당 파일(`AoMonthlyPerformanceTable.tsx`, `AoAlertBanner.tsx`, `buildAoPivot`, `buildAoCampaignAlerts`) 전혀 안 건드림(의도됨). 엣지 케이스(베리언트 0개/1개 캠페인) → `listAoCampaignVariants`가 자연스럽게 빈 배열이나 1개짜리 배열을 반환하고 컴포넌트 쪽 특별 처리 없이 그대로 동작(스펙에서 "숨기지 않는다"고 명시한 대로).
- **타입 일관성**: `AoCampaignSelection`을 `metrics.ts`에서 한 번만 정의하고 `AoCampaignDailyTable.tsx`/`CRMAlwaysOn.tsx`가 전부 그 타입을 import해서 씀 — 중복 정의 없음. `buildAoCampaignTrend`/`buildAoCampaignDailyRows` 둘 다 동일한 `matchesSelection` 헬퍼를 공유.
- **플레이스홀더 스캔**: 없음.
