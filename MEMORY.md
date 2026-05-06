# MEMORY.md

프로젝트 작업 중 반복하면 안 되는 시행착오와 원인 기록.

---

## Braze REST API 연동 시행착오

### 1. 브라우저에서 Braze REST API 직접 호출 금지

- 증상: `Braze /campaigns/list failed: 403 (REST API calls must only be used in a server-side environment. For client-side access use Braze SDKs.)`
- 원인: Braze REST API는 서버사이드 호출만 허용한다. Vite 클라이언트 번들에서 `VITE_BRAZE_REST_ENDPOINT`, `VITE_BRAZE_API_KEY`로 직접 호출하면 Braze가 차단한다.
- 재발 방지: 프론트는 `/api/braze/...` 내부 API만 호출하고, 실제 Braze REST API 호출은 Vercel Serverless Function에서 수행한다.

### 2. `VITE_BRAZE_*` 환경변수 사용 금지

- 증상: 서버 호출과 클라이언트 호출 경로가 혼재하고, API key가 브라우저 번들에 노출될 위험이 생김.
- 원인: Vite에서 `VITE_` prefix 환경변수는 클라이언트 코드에 노출된다.
- 재발 방지: Braze 환경변수는 `BRAZE_REST_ENDPOINT`, `BRAZE_API_KEY`만 사용한다. `VITE_BRAZE_REST_ENDPOINT`, `VITE_BRAZE_API_KEY` fallback도 두지 않는다.

### 3. Vercel API catch-all 경로 주의

- 증상: `/api/braze/campaigns/list` 호출 시 Vercel 404 `NOT_FOUND`.
- 원인: `api/braze/[...path].js` catch-all 함수가 배포 환경에서 기대대로 매칭되지 않았다.
- 재발 방지: 명시적인 Vercel API route 파일을 사용한다.
  - `api/braze/campaigns/list.js`
  - `api/braze/campaigns/details.js`
  - `api/braze/campaigns/data_series.js`
  - 공통 서버 로직은 `server/brazeProxy.js`

### 4. Braze `/campaigns/list` 응답 스키마 착각

- 증상: 목록 호출은 성공하지만 라이브 캠페인이 비거나 후속 렌더링이 부정확함.
- 원인: `/campaigns/list` 응답에는 `is_active`, `is_archived`, `channels`, `created_at`, `updated_at`이 없다. 목록 응답은 주로 `id`, `name`, `is_api_campaign`, `tags`, `last_edited` 중심이다.
- 재발 방지: 라이브 여부와 채널/일정 정보는 `/campaigns/details`에서 `enabled`, `archived`, `draft`, `channels`, `schedule_type`을 조회해서 판단한다.

### 5. Vercel private repo 배포와 커밋 이메일

- 증상 1: `Deployment Blocked` 및 commit author가 Vercel 프로젝트 contributing access가 없다는 오류.
- 증상 2: commit email `guneylee69@gmail.com` could not be matched to a GitHub account.
- 원인: GitHub 계정 이메일과 커밋 author 이메일 매칭이 중요하다. 이 repo에서는 GitHub 계정 이메일 `gunhee@martinee.io`로 커밋되어야 Vercel Git 연동이 정상 처리된다.
- 재발 방지: 이 repo의 로컬 Git 설정은 아래로 유지한다.

```bash
git config user.name "guney69"
git config user.email "gunhee@martinee.io"
```

Vercel 로그인 계정은 `guneylee69@gmail.com`이어도, Git commit author는 GitHub 계정 이메일 `gunhee@martinee.io`를 사용한다.

