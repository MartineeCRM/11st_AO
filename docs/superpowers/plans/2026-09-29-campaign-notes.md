# 캠페인별 메모 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AO 탭에서 캠페인을 선택했을 때, 그 캠페인에 대한 자유 텍스트 메모를 팀 전체(같은 스프레드시트를 쓰는 사람들)와 공유해서 읽고 쓸 수 있게 한다.

**Architecture:** `api/campaign-notes.ts`(Vercel 서버리스 함수)가 Vercel KV(Redis)에 스프레드시트ID당 해시 1개(`notes:{spreadsheetId}`, 필드=캠페인명)로 메모를 저장한다. 로컬 개발은 `vite.config.ts`의 `campaignNotesDevProxy` 플러그인이 같은 계약(GET/PUT, 같은 응답 형태)을 그대로 구현해 `api/sheets.ts` ↔ `sheetsDevProxy` 쌍과 동일한 구조를 따른다. 프론트는 `useCampaignNotesState` 훅이 전체 메모를 로드하고, AO 탭의 "캠페인별 추이" 섹션에 캠페인별 텍스트박스로 노출한다.

**Tech Stack:** React + TypeScript(기존), `@vercel/kv`(신규 의존성), Vercel Serverless Functions.

## Global Constraints

- 스프레드시트ID가 없으면(서버 기본 연결 사용 중) 저장/조회 키로 `'default'`를 쓴다 (스펙: 데이터 모델).
- 메모는 캠페인당 1개, 덮어쓰기 방식. 날짜별 로그·작성자·수정이력 없음 (스펙: Out of Scope).
- 메모 로드 실패는 AO 탭 전체를 절대 막지 않는다 — 항상 빈 상태로 조용히 폴백 (스펙: 에러 처리).
- 메모 저장 실패는 사용자에게 인라인으로 보여준다. 입력했던 텍스트는 잃지 않는다 (스펙: 에러 처리).
- 이 프로젝트는 자동화 테스트가 없다 — `npm run type-check` + 수동 브라우저 확인이 검증 방법이다 (스펙: 테스트).
- `NODE_ENV=production`이 고정된 환경이라 `npm install`에는 반드시 `--include=dev`를 붙인다 (CLAUDE.md 알려진 함정).
- 커밋 메시지에 `Co-Authored-By` 태그를 넣지 않는다 — Vercel Hobby 배포가 막힌다 (CLAUDE.md 알려진 함정).

참고 스펙: `docs/superpowers/specs/2026-09-29-campaign-notes-design.md`

---

## File Structure

| 파일 | 상태 | 역할 |
|---|---|---|
| `api/campaign-notes.ts` | 신규 | 프로덕션 서버리스 함수 — KV로 메모 GET/PUT |
| `vite.config.ts` | 수정 | 로컬 dev용 `campaignNotesDevProxy` 플러그인 추가 (기존 `sheetsDevProxy`와 같은 구조) |
| `.env.example` | 수정 | `KV_REST_API_URL`/`KV_REST_API_TOKEN` placeholder 추가 |
| `package.json` | 수정 (npm install) | `@vercel/kv` 의존성 추가 |
| `src/lib/campaignNotes.ts` | 신규 | 클라이언트 fetch 래퍼 (`fetchCampaignNotes`, `saveCampaignNote`) |
| `src/hooks/useCampaignNotesState.ts` | 신규 | React 훅 — 메모 상태 + 저장 상태 관리 |
| `src/App.tsx` | 수정 | 훅 인스턴스화, `CRMAlwaysOn`에 prop 전달 |
| `src/pages/CRMAlwaysOn.tsx` | 수정 | "캠페인별 추이" 섹션에 메모 텍스트박스 UI 추가 |

---

### Task 1: 백엔드 계약 — 서버리스 함수 + 로컬 dev 프록시

**Files:**
- Create: `api/campaign-notes.ts`
- Modify: `vite.config.ts`
- Modify: `.env.example`
- Modify: `package.json` (npm install)

**Interfaces:**
- Produces (HTTP 계약, Task 2가 그대로 소비):
  - `GET /api/campaign-notes?spreadsheetId=<string>` → 200, body `Record<string, string>` (캠페인명 → 메모). KV가 설정 안 됐거나 읽기 실패해도 항상 200 `{}` — 절대 에러 응답 안 함.
  - `PUT /api/campaign-notes`, body `{ spreadsheetId?: string, campaign: string, note?: string }` → 성공 시 200 `{ ok: true }`. `campaign` 없으면 400 `{ error: string }`. KV 미설정/쓰기 실패 시 500 `{ error: string }`.

- [ ] **Step 1: `@vercel/kv` 설치**

```bash
NODE_ENV=development npm install --include=dev @vercel/kv
```

- [ ] **Step 2: `.env.example`에 KV 환경변수 placeholder 추가**

`.env.example` 전체를 아래로 교체:

```bash
# Google Sheets (서버사이드 전용 — VITE_ prefix 없음, 브라우저에 절대 노출되지 않음)
SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SHEETS_API_KEY=your_google_sheets_api_key_here

# Vercel KV (캠페인별 메모 공유 저장 — Vercel 대시보드에서 KV 스토어 연결 시 자동 주입됨,
# 로컬 개발 시에도 같은 값을 여기 채워야 메모 기능이 동작함)
KV_REST_API_URL=your_kv_rest_api_url_here
KV_REST_API_TOKEN=your_kv_rest_api_token_here
```

- [ ] **Step 3: 서버리스 함수 작성**

`api/campaign-notes.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@vercel/kv'

function keyOf(spreadsheetId: string): string {
  return `notes:${spreadsheetId || 'default'}`
}

function getKv() {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) return null
  return createClient({ url, token })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const kv = getKv()

  if (req.method === 'GET') {
    const { spreadsheetId } = req.query as Record<string, string>
    if (!kv) {
      console.error('[campaign-notes] KV_REST_API_URL/KV_REST_API_TOKEN not configured')
      return res.status(200).json({})
    }
    try {
      const notes = await kv.hgetall<Record<string, string>>(keyOf(spreadsheetId ?? ''))
      res.setHeader('Cache-Control', 'private, no-store')
      return res.status(200).json(notes ?? {})
    } catch (err) {
      console.error('[campaign-notes] read failed', err)
      return res.status(200).json({})
    }
  }

  if (req.method === 'PUT') {
    const { spreadsheetId, campaign, note } = (req.body ?? {}) as { spreadsheetId?: string; campaign?: string; note?: string }
    if (!campaign) {
      return res.status(400).json({ error: 'campaign이 필요합니다.' })
    }
    if (!kv) {
      console.error('[campaign-notes] KV_REST_API_URL/KV_REST_API_TOKEN not configured')
      return res.status(500).json({ error: '메모 저장 기능이 아직 설정되지 않았습니다.' })
    }
    try {
      await kv.hset(keyOf(spreadsheetId ?? ''), { [campaign]: note ?? '' })
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error('[campaign-notes] write failed', err)
      return res.status(500).json({ error: '메모 저장에 실패했습니다.' })
    }
  }

  res.setHeader('Allow', 'GET, PUT')
  return res.status(405).json({ error: 'Method not allowed' })
}
```

- [ ] **Step 4: 로컬 dev 프록시 추가**

`vite.config.ts` 상단 import에 추가:

```ts
import { createClient } from '@vercel/kv'
```

`sheetsDevProxy` 함수 바로 아래에 새 함수 추가:

```ts
function campaignNotesDevProxy(env: Record<string, string>): Plugin {
  const kvUrl = env.KV_REST_API_URL
  const kvToken = env.KV_REST_API_TOKEN
  const kv = kvUrl && kvToken ? createClient({ url: kvUrl, token: kvToken }) : null

  function keyOf(spreadsheetId: string): string {
    return `notes:${spreadsheetId || 'default'}`
  }

  return {
    name: 'campaign-notes-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/campaign-notes', async (req, res) => {
        const incomingUrl = new URL(req.url ?? '/', 'http://localhost')

        if (req.method === 'GET') {
          const spreadsheetId = incomingUrl.searchParams.get('spreadsheetId') ?? ''
          res.setHeader('Content-Type', 'application/json')
          if (!kv) {
            console.error('[campaign-notes-dev-proxy] KV_REST_API_URL/KV_REST_API_TOKEN not configured')
            res.end(JSON.stringify({}))
            return
          }
          try {
            const notes = await kv.hgetall(keyOf(spreadsheetId))
            res.end(JSON.stringify(notes ?? {}))
          } catch (error) {
            console.error('[campaign-notes-dev-proxy] read failed', error)
            res.end(JSON.stringify({}))
          }
          return
        }

        if (req.method === 'PUT') {
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          let body: { spreadsheetId?: string; campaign?: string; note?: string } = {}
          try {
            body = JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}')
          } catch {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: '잘못된 요청 본문입니다.' }))
            return
          }

          res.setHeader('Content-Type', 'application/json')
          if (!body.campaign) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'campaign이 필요합니다.' }))
            return
          }
          if (!kv) {
            console.error('[campaign-notes-dev-proxy] KV_REST_API_URL/KV_REST_API_TOKEN not configured')
            res.statusCode = 500
            res.end(JSON.stringify({ error: '메모 저장 기능이 아직 설정되지 않았습니다.' }))
            return
          }
          try {
            await kv.hset(keyOf(body.spreadsheetId ?? ''), { [body.campaign]: body.note ?? '' })
            res.end(JSON.stringify({ ok: true }))
          } catch (error) {
            console.error('[campaign-notes-dev-proxy] write failed', error)
            res.statusCode = 500
            res.end(JSON.stringify({ error: '메모 저장에 실패했습니다.' }))
          }
          return
        }

        res.statusCode = 405
        res.end()
      })
    },
  }
}
```

`defineConfig`의 `plugins` 배열을 수정:

```ts
plugins: [react(), tailwindcss(), sheetsDevProxy(env), campaignNotesDevProxy(env)],
```

- [ ] **Step 5: dev 서버 실행 후 curl로 계약 확인 (KV 환경변수 없는 상태 그대로, 아직 `.env`에 KV 값 안 넣어도 됨)**

```bash
NODE_ENV=development npm run dev &
sleep 2
echo "--- GET (빈 객체 기대) ---"
curl -s http://localhost:5173/api/campaign-notes?spreadsheetId=test
echo "\n--- PUT campaign 없이 (400 기대) ---"
curl -s -X PUT http://localhost:5173/api/campaign-notes -H "Content-Type: application/json" -d '{}'
echo "\n--- PUT KV 미설정 (500 기대) ---"
curl -s -X PUT http://localhost:5173/api/campaign-notes -H "Content-Type: application/json" -d '{"spreadsheetId":"test","campaign":"테스트","note":"hi"}'
```

Expected:
- GET → `{}`
- PUT (no campaign) → `{"error":"campaign이 필요합니다."}`
- PUT (with campaign, no KV configured) → `{"error":"메모 저장 기능이 아직 설정되지 않았습니다."}`

- [ ] **Step 6: dev 서버 종료**

```bash
pkill -f "vite" || true
```

- [ ] **Step 7: Commit**

```bash
git add api/campaign-notes.ts vite.config.ts .env.example package.json package-lock.json
git commit -m "feat(api): add shared campaign-notes endpoint backed by Vercel KV"
```

---

### Task 2: 클라이언트 — 훅 + AO 탭 UI

**Files:**
- Create: `src/lib/campaignNotes.ts`
- Create: `src/hooks/useCampaignNotesState.ts`
- Modify: `src/App.tsx`
- Modify: `src/pages/CRMAlwaysOn.tsx`

**Interfaces:**
- Consumes: Task 1의 `GET /api/campaign-notes?spreadsheetId=`, `PUT /api/campaign-notes` 계약 (위 참고)
- Produces:
  - `fetchCampaignNotes(spreadsheetId: string): Promise<Record<string, string>>`
  - `saveCampaignNote(spreadsheetId: string, campaign: string, note: string): Promise<void>` (실패 시 throw)
  - `useCampaignNotesState(spreadsheetId: string): { notes: Record<string, string>; saveStatus: Record<string, 'idle' | 'saved' | 'error'>; saveNote: (campaign: string, note: string) => void }`

- [ ] **Step 1: 클라이언트 fetch 래퍼 작성**

`src/lib/campaignNotes.ts`:

```ts
export async function fetchCampaignNotes(spreadsheetId: string): Promise<Record<string, string>> {
  try {
    const params = new URLSearchParams()
    if (spreadsheetId) params.set('spreadsheetId', spreadsheetId)
    const res = await fetch(`/api/campaign-notes?${params.toString()}`)
    if (!res.ok) return {}
    return (await res.json()) as Record<string, string>
  } catch {
    return {}
  }
}

export async function saveCampaignNote(spreadsheetId: string, campaign: string, note: string): Promise<void> {
  const res = await fetch('/api/campaign-notes', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spreadsheetId, campaign, note }),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(typeof json.error === 'string' ? json.error : '메모 저장 실패')
  }
}
```

- [ ] **Step 2: 훅 작성**

`src/hooks/useCampaignNotesState.ts`:

```ts
import { useEffect, useRef, useState } from 'react'
import { fetchCampaignNotes, saveCampaignNote } from '@/lib/campaignNotes'

export type NoteSaveStatus = 'idle' | 'saved' | 'error'

export function useCampaignNotesState(spreadsheetId: string) {
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [saveStatus, setSaveStatus] = useState<Record<string, NoteSaveStatus>>({})
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    fetchCampaignNotes(spreadsheetId).then(data => {
      if (mounted.current) setNotes(data)
    })
    return () => { mounted.current = false }
  }, [spreadsheetId])

  function saveNote(campaign: string, note: string) {
    setNotes(prev => ({ ...prev, [campaign]: note }))
    saveCampaignNote(spreadsheetId, campaign, note)
      .then(() => {
        if (mounted.current) setSaveStatus(prev => ({ ...prev, [campaign]: 'saved' }))
      })
      .catch(() => {
        if (mounted.current) setSaveStatus(prev => ({ ...prev, [campaign]: 'error' }))
      })
  }

  return { notes, saveStatus, saveNote }
}
```

- [ ] **Step 3: `App.tsx`에 훅 연결**

`import` 추가:

```ts
import { useCampaignNotesState } from '@/hooks/useCampaignNotesState'
```

`useAlertCampaignsState()` 호출 바로 아래에 추가:

```ts
const campaignNotes = useCampaignNotesState(sheetConnection.connection.spreadsheetId)
```

`<CRMAlwaysOn ... />`에 prop 추가:

```tsx
<CRMAlwaysOn
  sheetData={sheetData}
  aoRows={aoRows}
  campaignOptions={campaignOptions}
  monitoredCampaigns={alertCampaigns.selected}
  campaignNotes={campaignNotes}
/>
```

- [ ] **Step 4: `CRMAlwaysOn.tsx`에 Props 타입 + import 추가**

`import` 추가:

```ts
import type { NoteSaveStatus } from '@/hooks/useCampaignNotesState'
```

`Props` 인터페이스 수정:

```ts
interface Props {
  sheetData: SheetData
  aoRows: AoPushRow[]
  campaignOptions: string[]
  monitoredCampaigns: string[]
  campaignNotes: {
    notes: Record<string, string>
    saveStatus: Record<string, NoteSaveStatus>
    saveNote: (campaign: string, note: string) => void
  }
}
```

함수 시그니처 수정:

```ts
export function CRMAlwaysOn({ sheetData, aoRows, campaignOptions, monitoredCampaigns, campaignNotes }: Props) {
```

- [ ] **Step 5: 로컬 메모 입력 상태 추가**

기존 `const [selectedCampaign, setSelectedCampaign] = useState('')` 아래에 추가:

```ts
const [noteDraft, setNoteDraft] = useState('')

useEffect(() => {
  setNoteDraft(campaignNotes.notes[selectedCampaign] ?? '')
}, [selectedCampaign, campaignNotes.notes])
```

- [ ] **Step 6: "캠페인별 추이" 섹션에 메모 텍스트박스 렌더링**

`<h2>캠페인별 추이</h2>` 헤더가 있는 `<div className="flex items-center justify-between px-1">...</div>` 블록 바로 다음(그리고 `{trendView === 'chart' ? ... }` 이전)에 삽입:

```tsx
<div className="flex flex-col gap-1">
  <textarea
    value={noteDraft}
    onChange={e => setNoteDraft(e.target.value)}
    onBlur={() => {
      if (selectedCampaign && noteDraft !== (campaignNotes.notes[selectedCampaign] ?? '')) {
        campaignNotes.saveNote(selectedCampaign, noteDraft)
      }
    }}
    placeholder="이 캠페인 특이사항 메모..."
    rows={2}
    className="w-full resize-none rounded-lg border border-[#e0e0e0] px-3 py-2 text-xs text-[#1d1d1f] outline-none focus:border-[#0066cc]"
  />
  {campaignNotes.saveStatus[selectedCampaign] === 'saved' && (
    <span className="text-[11px] text-[#9CA3AF]">저장됨</span>
  )}
  {campaignNotes.saveStatus[selectedCampaign] === 'error' && (
    <span className="text-[11px] text-[#EF4444]">저장 실패, 다시 시도</span>
  )}
</div>
```

- [ ] **Step 7: 타입 체크**

```bash
NODE_ENV=development npm run type-check
```

Expected: 에러 없음.

- [ ] **Step 8: 브라우저 수동 확인**

```bash
NODE_ENV=development npm run dev &
sleep 2
```

브라우저에서 `http://localhost:5173` 열고 (내장 브라우저 도구 사용):
1. AO 탭 → 캠페인 하나 선택 → "캠페인별 추이" 헤더 아래에 메모 텍스트박스가 보이는지 확인
2. 텍스트박스에 메모 입력 → 다른 곳 클릭(blur) → KV 미설정 상태이므로 "저장 실패, 다시 시도" 표시되는지 확인 (Task 1에서 확인한 500 응답 경로)
3. 다른 캠페인으로 전환 → 텍스트박스가 빈 상태로 바뀌는지 확인 (그 캠페인엔 저장된 메모가 없으므로)
4. AO 탭 전체(차트, 알림 배너 등)가 메모 저장 실패와 무관하게 정상 동작하는지 확인 (에러 처리 원칙 확인)

이후 `KV_REST_API_URL`/`KV_REST_API_TOKEN`을 실제 값으로 `.env`에 채운 뒤(사용자가 Vercel KV 스토어 생성 후 제공) 같은 시나리오를 다시 확인하면 "저장됨" 경로와 새로고침 후 유지되는지까지 검증 가능 — 이 부분은 실제 KV 자격증명이 있어야 하므로 이 태스크의 필수 완료 조건에서는 제외.

```bash
pkill -f "vite" || true
```

- [ ] **Step 9: Commit**

```bash
git add src/lib/campaignNotes.ts src/hooks/useCampaignNotesState.ts src/App.tsx src/pages/CRMAlwaysOn.tsx
git commit -m "feat(ao): add shared per-campaign notes UI"
```

---

## Self-Review Notes

- **스펙 커버리지**: 데이터 모델(해시+`default`키) → Task 1 Step 3/4. 백엔드 API 계약 → Task 1. 사전 설정(Vercel KV 연결) → Task 1 Step 2 안내 + 아래 "배포 전 확인" 참고. 클라이언트 훅/UI → Task 2. 에러 처리(로드 실패 조용히/저장 실패 표시) → Task 1(GET 항상 200) + Task 2 Step 6(에러 텍스트) + Step 8(검증). 테스트 방침(자동화 없음, 수동 체크리스트) → 각 태스크 Step 5/8. Out of Scope 항목은 계획에 포함 안 함(의도됨).
- **타입 일관성**: `NoteSaveStatus`는 훅에서 정의해 `CRMAlwaysOn.tsx`가 `import type`으로 재사용 — 이름 불일치 없음. `campaignNotes` prop 모양이 훅의 반환 타입과 정확히 일치.
- **플레이스홀더 스캔**: 없음.

## 배포 전 확인 (사용자가 직접 해야 하는 일)

1. Vercel 대시보드 → 이 프로젝트 → Storage → KV 스토어 생성 및 연결 (자동으로 `KV_REST_API_URL`/`KV_REST_API_TOKEN` 환경변수 주입됨)
2. 로컬 개발도 하려면 같은 값을 `.env`에 채워넣기
3. 배포 후 실제 KV 연결 상태에서 "저장됨" → 새로고침 → 메모 유지되는지, 그리고 팀원 다른 브라우저에서도 같은 메모가 보이는지 최종 확인
