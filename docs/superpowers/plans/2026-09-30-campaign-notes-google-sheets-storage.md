# 캠페인별 메모 — Google Sheets 저장소 교체 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이미 배포된 "캠페인별 메모" 기능의 저장소를 Upstash Redis에서, AO 대시보드가 이미 읽고 있는 스프레드시트 안의 `캠페인_메모` 탭(Google Sheets)으로 교체한다.

**Architecture:** `api/campaign-notes.ts`(Vercel 서버리스 함수)와 `vite.config.ts`의 `campaignNotesDevProxy`가 Google 서비스 계정(`google-auth-library`의 `JWT`)으로 인증해서, `캠페인_메모!A:B` 고정 범위에 대해 Sheets API v4를 plain `fetch()`로 직접 호출한다. 프론트엔드(HTTP 계약, `src/lib/campaignNotes.ts`, `useCampaignNotesState`, `CRMAlwaysOn.tsx`)는 전혀 안 바뀐다.

**Tech Stack:** `google-auth-library`(신규 의존성, JWT/서비스 계정 인증 전용 — 무거운 `googleapis` SDK 안 씀), Google Sheets API v4 REST (기존 `lib/googleSheets.ts` 스타일과 동일하게 SDK 없이 fetch), Vercel Serverless Functions.

## Global Constraints

- 스프레드시트ID 해석은 `api/sheets.ts`와 완전히 동일한 규칙을 따른다: 클라이언트가 보낸 `spreadsheetId` 우선, 없으면 서버 `.env`의 `SPREADSHEET_ID`로 폴백.
- **절대 규칙**: 모든 Sheets API 호출은 `캠페인_메모!A:B`라는 고정 문자열 range만 사용한다. 탭 이름을 요청 파라미터나 다른 값으로부터 동적으로 만들지 않는다. `batchUpdate`(탭 생성/삭제 등 스프레드시트 전체에 영향을 주는 호출)는 절대 쓰지 않는다 — `values.get`/`values.update`/`values.append`만 사용.
- `캠페인_메모` 탭은 이미 만들어져 있다고 가정한다(`A1`=`캠페인명`, `B1`=`메모`). 탭이 없거나 이름이 다르면 조용히 실패 처리(아래 에러 처리 참고) — 자동 생성 로직은 만들지 않는다.
- 메모 로드 실패는 AO 탭 전체를 절대 막지 않는다 — GET은 인증 미설정이든 읽기 실패든 항상 200을 반환해야 한다(빈 객체).
- 메모 저장 실패는 사용자에게 인라인으로 보여준다 — PUT은 campaign 누락/글자수 초과 시 400, 인증 미설정/쓰기 실패 시 500과 에러 메시지를 반환해야 한다(프론트가 이미 이 상태 코드로 분기하도록 구현돼 있음, 변경 없음).
- `campaign` 길이 제한 200자, `note` 길이 제한 2000자 — 기존 Upstash 버전과 동일한 값 유지.
- `NODE_ENV=production`이 고정된 환경이라 `npm install`/`npm uninstall`에는 반드시 `--include=dev`를 붙인다.
- 커밋 메시지에 `Co-Authored-By` 태그를 넣지 않는다 — Vercel Hobby 배포가 막힌다.
- 이 프로젝트는 자동화 테스트가 없다 — `npm run type-check` + 수동 확인(curl, 가능하면 브라우저)이 검증 방법이다.

참고 스펙: `docs/superpowers/specs/2026-09-29-campaign-notes-design.md`

---

## File Structure

| 파일 | 상태 | 역할 |
|---|---|---|
| `api/campaign-notes.ts` | 수정 | Upstash → Google Sheets(서비스 계정)로 전면 재작성 |
| `vite.config.ts` | 수정 | `campaignNotesDevProxy`를 같은 방식으로 재작성 (`sheetsDevProxy`와 나란히 유지) |
| `.env.example` | 수정 | Upstash 변수 제거, `GOOGLE_SERVICE_ACCOUNT_EMAIL`/`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` 추가 |
| `package.json` | 수정 (npm) | `@upstash/redis` 제거, `google-auth-library` 추가 |

프론트엔드 파일(`src/lib/campaignNotes.ts`, `src/hooks/useCampaignNotesState.ts`, `src/pages/CRMAlwaysOn.tsx`, `src/App.tsx`)은 이 플랜에서 전혀 건드리지 않는다 — HTTP 계약이 그대로라서.

---

### Task 1: 백엔드 저장소를 Google Sheets로 교체

**Files:**
- Modify: `api/campaign-notes.ts` (전체 재작성)
- Modify: `vite.config.ts` (`campaignNotesDevProxy` 함수 + 상단 import 전체 재작성)
- Modify: `.env.example`
- Modify: `package.json` / `package-lock.json` (npm uninstall + install)

**Interfaces:**
- Consumes: 없음 (이 태스크가 첫 태스크)
- Produces: HTTP 계약은 기존과 100% 동일하게 유지(프론트가 이미 이걸 소비하고 있음, 변경 불필요):
  - `GET /api/campaign-notes?spreadsheetId=<string>` → 200, body `Record<string, string>` (캠페인명 → 메모). 인증 미설정/스프레드시트ID 없음/읽기 실패 어떤 경우든 항상 200 `{}`.
  - `PUT /api/campaign-notes`, body `{ spreadsheetId?: string, campaign: string, note?: string }` → 200 `{ ok: true }` 성공. `campaign` 없으면 400. `campaign.length > 200` 이면 400. `note`가 있는데 문자열이 아니거나 2000자 초과면 400. 인증 미설정/스프레드시트ID 없음/쓰기 실패 시 500.

- [ ] **Step 1: 의존성 교체**

```bash
NODE_ENV=development npm uninstall @upstash/redis
NODE_ENV=development npm install --include=dev google-auth-library
```

- [ ] **Step 2: `.env.example` 갱신**

`.env.example` 전체를 아래로 교체:

```bash
# Google Sheets (서버사이드 전용 — VITE_ prefix 없음, 브라우저에 절대 노출되지 않음)
SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SHEETS_API_KEY=your_google_sheets_api_key_here

# Google 서비스 계정 (캠페인별 메모 쓰기 전용 — 위 SPREADSHEET_ID로 지정된 스프레드시트에
# "편집자"로 공유해야 함. Google Cloud Console에서 서비스 계정 생성 후 JSON 키 발급.
# private key는 JSON 안의 개행이 \n으로 이스케이프된 문자열 그대로 넣으면 됨)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email_here
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=your_service_account_private_key_here
```

- [ ] **Step 3: `api/campaign-notes.ts` 전체 재작성**

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { JWT } from 'google-auth-library'

const SHEET_NAME = '캠페인_메모'
const RANGE = `${SHEET_NAME}!A:B`
const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

function getAuthClient(): JWT | null {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  if (!email || !rawKey) return null
  return new JWT({
    email,
    key: rawKey.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

async function getAccessToken(auth: JWT): Promise<string> {
  const { token } = await auth.getAccessToken()
  if (!token) throw new Error('Failed to obtain Google access token')
  return token
}

async function readRows(spreadsheetId: string, token: string): Promise<string[][]> {
  const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(RANGE)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Sheets read failed: ${res.status} ${text}`)
  }
  const json = (await res.json()) as { values?: string[][] }
  return json.values ?? []
}

function notesFromRows(rows: string[][]): Record<string, string> {
  const notes: Record<string, string> = {}
  for (let i = 1; i < rows.length; i++) {
    const campaign = rows[i]?.[0]
    if (campaign) notes[campaign] = rows[i]?.[1] ?? ''
  }
  return notes
}

async function writeNote(spreadsheetId: string, token: string, campaign: string, note: string): Promise<void> {
  const rows = await readRows(spreadsheetId, token)
  const matchIndex = rows.findIndex((row, i) => i > 0 && row[0] === campaign)

  if (matchIndex > 0) {
    const range = `${SHEET_NAME}!B${matchIndex + 1}`
    const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`
    const res = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [[note]] }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Sheets update failed: ${res.status} ${text}`)
    }
  } else {
    const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(RANGE)}:append?valueInputOption=RAW`
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [[campaign, note]] }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Sheets append failed: ${res.status} ${text}`)
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = getAuthClient()

  if (req.method === 'GET') {
    const { spreadsheetId: qsSpreadsheetId } = req.query as Record<string, string>
    const spreadsheetId = qsSpreadsheetId || process.env.SPREADSHEET_ID
    if (!auth || !spreadsheetId) {
      console.error('[campaign-notes] GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY or spreadsheetId not configured')
      return res.status(200).json({})
    }
    try {
      const token = await getAccessToken(auth)
      const rows = await readRows(spreadsheetId, token)
      res.setHeader('Cache-Control', 'private, no-store')
      return res.status(200).json(notesFromRows(rows))
    } catch (err) {
      console.error('[campaign-notes] read failed', err)
      return res.status(200).json({})
    }
  }

  if (req.method === 'PUT') {
    const { spreadsheetId: bodySpreadsheetId, campaign, note } = (req.body ?? {}) as { spreadsheetId?: string; campaign?: string; note?: string }
    if (!campaign) {
      return res.status(400).json({ error: 'campaign이 필요합니다.' })
    }
    if (typeof campaign !== 'string' || campaign.length > 200) {
      return res.status(400).json({ error: 'campaign이 너무 깁니다 (최대 200자).' })
    }
    if (note !== undefined && (typeof note !== 'string' || note.length > 2000)) {
      return res.status(400).json({ error: 'note가 너무 깁니다 (최대 2000자).' })
    }
    const spreadsheetId = bodySpreadsheetId || process.env.SPREADSHEET_ID
    if (!auth || !spreadsheetId) {
      console.error('[campaign-notes] GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY or spreadsheetId not configured')
      return res.status(500).json({ error: '메모 저장 기능이 아직 설정되지 않았습니다.' })
    }
    try {
      const token = await getAccessToken(auth)
      await writeNote(spreadsheetId, token, campaign, note ?? '')
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

- [ ] **Step 4: `vite.config.ts` 재작성**

상단 import에서 `import { Redis } from '@upstash/redis'`를 제거하고 아래로 교체:

```ts
import { JWT } from 'google-auth-library'
```

`campaignNotesDevProxy` 함수 전체를 아래로 교체 (`sheetsDevProxy` 함수는 그대로 둔다):

```ts
function campaignNotesDevProxy(env: Record<string, string>): Plugin {
  const SHEET_NAME = '캠페인_메모'
  const RANGE = `${SHEET_NAME}!A:B`
  const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

  function getAuthClient(): JWT | null {
    const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    const rawKey = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    if (!email || !rawKey) return null
    return new JWT({
      email,
      key: rawKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
  }

  async function getAccessToken(auth: JWT): Promise<string> {
    const { token } = await auth.getAccessToken()
    if (!token) throw new Error('Failed to obtain Google access token')
    return token
  }

  async function readRows(spreadsheetId: string, token: string): Promise<string[][]> {
    const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(RANGE)}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Sheets read failed: ${res.status} ${text}`)
    }
    const json = (await res.json()) as { values?: string[][] }
    return json.values ?? []
  }

  function notesFromRows(rows: string[][]): Record<string, string> {
    const notes: Record<string, string> = {}
    for (let i = 1; i < rows.length; i++) {
      const campaign = rows[i]?.[0]
      if (campaign) notes[campaign] = rows[i]?.[1] ?? ''
    }
    return notes
  }

  async function writeNote(spreadsheetId: string, token: string, campaign: string, note: string): Promise<void> {
    const rows = await readRows(spreadsheetId, token)
    const matchIndex = rows.findIndex((row, i) => i > 0 && row[0] === campaign)

    if (matchIndex > 0) {
      const range = `${SHEET_NAME}!B${matchIndex + 1}`
      const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`
      const res = await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [[note]] }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Sheets update failed: ${res.status} ${text}`)
      }
    } else {
      const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(RANGE)}:append?valueInputOption=RAW`
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [[campaign, note]] }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Sheets append failed: ${res.status} ${text}`)
      }
    }
  }

  return {
    name: 'campaign-notes-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/campaign-notes', async (req, res) => {
        const incomingUrl = new URL(req.url ?? '/', 'http://localhost')
        const auth = getAuthClient()

        if (req.method === 'GET') {
          const spreadsheetId = incomingUrl.searchParams.get('spreadsheetId') || env.SPREADSHEET_ID || ''
          res.setHeader('Content-Type', 'application/json')
          if (!auth || !spreadsheetId) {
            console.error('[campaign-notes-dev-proxy] GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY or spreadsheetId not configured')
            res.end(JSON.stringify({}))
            return
          }
          try {
            const token = await getAccessToken(auth)
            const rows = await readRows(spreadsheetId, token)
            res.end(JSON.stringify(notesFromRows(rows)))
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
          if (typeof body.campaign !== 'string' || body.campaign.length > 200) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'campaign이 너무 깁니다 (최대 200자).' }))
            return
          }
          if (body.note !== undefined && (typeof body.note !== 'string' || body.note.length > 2000)) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'note가 너무 깁니다 (최대 2000자).' }))
            return
          }
          const spreadsheetId = body.spreadsheetId || env.SPREADSHEET_ID || ''
          if (!auth || !spreadsheetId) {
            console.error('[campaign-notes-dev-proxy] GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY or spreadsheetId not configured')
            res.statusCode = 500
            res.end(JSON.stringify({ error: '메모 저장 기능이 아직 설정되지 않았습니다.' }))
            return
          }
          try {
            const token = await getAccessToken(auth)
            await writeNote(spreadsheetId, token, body.campaign, body.note ?? '')
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

`defineConfig`의 `plugins` 배열은 그대로 둔다 (이미 `campaignNotesDevProxy(env)`가 들어있음, 함수 내부만 바뀜).

- [ ] **Step 5: 타입 체크**

```bash
NODE_ENV=development npm run type-check
```

Expected: 에러 없음 (참고: `api/*.ts`는 어떤 tsconfig에도 포함되지 않아 이 명령이 실제로 검사하지 않는 기존 프로젝트의 알려진 한계 — `vite.config.ts`는 `tsconfig.node.json`에 포함되어 실제로 검사됨. 이 한계 자체를 고치는 건 이 태스크 범위 밖).

- [ ] **Step 6: dev 서버 실행 후 curl로 계약 확인 (서비스 계정 환경변수 없는 상태 그대로 — 아직 `.env`에 값 안 넣어도 됨)**

```bash
NODE_ENV=development npm run dev &
sleep 2
echo "--- GET (빈 객체 기대, 서비스 계정 미설정) ---"
curl -s http://localhost:5173/api/campaign-notes?spreadsheetId=test
echo "\n--- PUT campaign 없이 (400 기대) ---"
curl -s -X PUT http://localhost:5173/api/campaign-notes -H "Content-Type: application/json" -d '{}'
echo "\n--- PUT campaign 200자 초과 (400 기대) ---"
curl -s -X PUT http://localhost:5173/api/campaign-notes -H "Content-Type: application/json" -d "{\"campaign\":\"$(python3 -c 'print("a"*201)')\",\"note\":\"x\"}"
echo "\n--- PUT 서비스 계정 미설정, 정상 campaign (500 기대) ---"
curl -s -X PUT http://localhost:5173/api/campaign-notes -H "Content-Type: application/json" -d '{"spreadsheetId":"test","campaign":"테스트","note":"hi"}'
pkill -f "vite" || true
```

Expected:
- GET → `{}`
- PUT (no campaign) → `{"error":"campaign이 필요합니다."}`
- PUT (campaign too long) → `{"error":"campaign이 너무 깁니다 (최대 200자)."}`
- PUT (valid campaign, no service account configured) → `{"error":"메모 저장 기능이 아직 설정되지 않았습니다."}`

- [ ] **Step 7: (있으면) 실제 서비스 계정으로 라이브 확인**

`.env`에 `GOOGLE_SERVICE_ACCOUNT_EMAIL`/`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`가 이미 채워져 있다면(사용자가 이 태스크 실행 전에 서비스 계정을 만들어서 `.env`에 넣어뒀다면), 그 스프레드시트가 서비스 계정에 편집자로 공유돼 있다는 전제하에 실제 저장까지 확인:

```bash
NODE_ENV=development npm run dev &
sleep 2
curl -s -X PUT http://localhost:5173/api/campaign-notes -H "Content-Type: application/json" -d '{"campaign":"__plan_test__","note":"임시 테스트 메모"}'
curl -s "http://localhost:5173/api/campaign-notes"
pkill -f "vite" || true
```

`{"ok":true}`가 오고, 이어지는 GET 응답에 `"__plan_test__":"임시 테스트 메모"`가 포함되면 성공. 확인 후 스프레드시트에서 그 테스트 행은 지워도 되고 남겨둬도 무방(사용자에게 물어볼 것).

환경변수가 아직 없으면 이 스텝은 스킵하고 Step 6까지의 결과만으로 완료 처리한다 — 실제 서비스 계정 발급은 사용자가 별도로 진행하는 수동 작업이라 이 태스크의 필수 완료 조건이 아니다.

- [ ] **Step 8: Commit**

```bash
git add api/campaign-notes.ts vite.config.ts .env.example package.json package-lock.json
git commit -m "feat(api): switch campaign-notes storage from Upstash Redis to Google Sheets"
```

---

## Self-Review Notes

- **스펙 커버리지**: 데이터 모델(탭 이름/컬럼/스프레드시트 스코핑) → Step 3/4의 `SHEET_NAME`/`RANGE` 상수. 백엔드 API 계약(GET/PUT 상태 코드, 항상 200 GET) → Step 3/4 핸들러 로직 + Step 6 curl 검증. "절대 규칙"(고정 range만 사용, `batchUpdate` 금지) → Step 3/4 코드에 다른 range 문자열이나 `batchUpdate` 호출이 전혀 없음. 동시 저장 경쟁 → 스펙에서 이미 범위 밖으로 명시, 이 플랜에서 별도 처리 안 함(의도됨). 사전 설정(서비스 계정 생성/공유) → 이 플랜의 필수 완료 조건이 아님(사용자가 별도로 진행), Step 7에서 있으면 검증만.
- **타입 일관성**: `JWT` 타입은 `google-auth-library`에서 양쪽 파일이 동일하게 import. 헬퍼 함수(`getAuthClient`/`getAccessToken`/`readRows`/`notesFromRows`/`writeNote`) 이름과 시그니처가 `api/campaign-notes.ts`와 `vite.config.ts` 양쪽에서 동일 — 의도적 중복(기존 `sheetsDevProxy`/`api/sheets.ts` 패턴)이라 이름이 갈리면 안 됨.
- **플레이스홀더 스캔**: 없음.
