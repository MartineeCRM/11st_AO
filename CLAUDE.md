# CLAUDE.md

## 프로젝트 개요

특정 클라이언트(11번가)의 AO(Always-on) CRM 푸시 캠페인 실적을 모니터링하는 단일 목적 대시보드.

- **주 타겟**: CRM 마케팅 실무자
- **보조 타겟**: 팀장/이사급 의사결정권자

### 탭 구성

1. **AO 캠페인 모니터링** — AO 푸시 캠페인별 일/주/월 추이, 캠페인별 실적 테이블, 기간 비교
2. **설정** — Google Sheets 연결(스프레드시트 ID/시트명/API 키)과 차트 색상 커스터마이징. 둘 다 이 브라우저에만 저장(`localStorage`)되며 서버에 저장되지 않는다.

로그인/인증/Attribution/운영 관리 탭은 없다. 여러 고객사가 같은 배포를 함께 쓸 수 있도록, 사용자별로 설정 탭에서 자기 스프레드시트/API 키를 개별 지정할 수 있다 (아래 "데이터 소스" 참고). 배포자가 지정한 서버 기본 연결(`.env`)은, 사용자가 설정을 비워둔 경우의 fallback으로만 쓰인다.

---

## 기술 스택

| 항목 | 선택 |
| --- | --- |
| Framework | React + Vite |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Charts | Recharts |
| Data | Google Sheets API (서버사이드 프록시 경유, `api/sheets.ts` / dev: `vite.config.ts` 프록시) |

---

## 개발 명령어

```bash
npm install          # 의존성 설치
npm run dev          # 개발 서버 (localhost:5173)
npm run build        # 프로덕션 빌드
npm run preview      # 빌드 결과 미리보기
npm run lint         # ESLint 실행
npm run type-check   # TypeScript 타입 검사
```

---

## 환경변수 / 사용자별 연결

서버 기본 연결(배포자가 한 번 설정, 모든 사용자의 fallback)은 `.env`에 설정:

```text
SPREADSHEET_ID=<스프레드시트 ID>
GOOGLE_SHEETS_API_KEY=<API 키>
```

`VITE_` prefix를 붙이지 않는다 — `VITE_` 변수는 빌드 시 브라우저 번들에 그대로 노출된다. 이 두 값은 서버 전용 시크릿이며 `api/sheets.ts`(배포)와 `vite.config.ts`의 dev 프록시(로컬)에서만 `process.env`로 읽는다.

**사용자별 연결(설정 탭)**: 로그인/멀티테넌시 없이도 여러 고객사가 같은 배포를 쓸 수 있도록, 각 사용자는 설정 탭에서 자기 스프레드시트 ID/시트명/Google Sheets API 키를 입력할 수 있다 (쿼터·비용 분리 목적으로 고객사마다 자기 GCP 프로젝트 키를 쓰는 걸 전제로 함 — 모든 시트가 "링크가 있는 사람은 누구나 보기"로 공유돼 있어야 API 키 방식이 작동한다). 이 값은 `useSheetConnectionState`가 `localStorage`(`crm_sheet_connection`)에만 저장하고, `googleSheets.ts`가 요청 시 `spreadsheetId`/`sheet`는 쿼리 파라미터로, API 키는 `x-sheets-api-key` 요청 헤더로 `/api/sheets`에 전달한다. `api/sheets.ts`/`vite.config.ts` 프록시는 이 값이 있으면 우선 사용하고, 없으면 서버 `.env` 기본값으로 대체한다. 즉 스프레드시트 ID·API 키는 클라이언트 번들에 하드코딩되지 않고, 요청마다 사용자 브라우저 → 우리 서버 프록시 → Google로만 전달된다.

`.env` 파일은 절대 커밋하지 않는다. `.env.example`만 커밋하며, 실제 스프레드시트 ID/키 값을 넣지 않는다 (placeholder만).

---

## 프로젝트 구조

```text
api/
  sheets.ts               # Vercel 서버리스 함수 — Google Sheets 프록시 (클라이언트 연결정보 우선, 없으면 서버 .env fallback)
src/
  components/
    ui/                    # shadcn/ui 기본 컴포넌트 (직접 수정 금지)
    charts/
      AoCampaignTrendChart.tsx
    filters/               # 날짜/캠페인/정렬 필터 컴포넌트
    AoCampaignDailyTable.tsx
    AoMonthlyPerformanceTable.tsx
    AoPeriodComparisonTable.tsx
    TopNav.tsx
  hooks/
    useSheetData.ts             # Google Sheets 원본 데이터 페칭 + 캐시(연결별로 분리) + 에러 상태
    useSheetConnectionState.ts  # 사용자별 Sheets 연결 상태 (App.tsx에서 단일 인스턴스로 유지, AO/Settings에는 props로 전달)
    useChartColorsState.ts      # 차트 색상 상태 (App.tsx에서 단일 인스턴스로 유지, Settings에는 props로 전달)
  lib/
    googleSheets.ts         # Sheets API 클라이언트 + 헤더(열 순서) 검증
    formatters.ts            # 숫자/날짜 포맷 유틸
    metrics.ts                # 지표 계산 순수 함수
    chartColors.ts             # 차트 색상 Context/기본값
  types/
    sheets.ts               # 시트 raw 데이터 타입 (AoPushRow)
  pages/
    CRMAlwaysOn.tsx          # AO 캠페인 모니터링 탭
    CRMSettings.tsx           # 설정 탭 (Google Sheets 연결 + 차트 색상)
```

---

## 데이터 소스

- **소스**: Google Sheets, 기본 탭 이름은 `브레이즈 푸시 실적` (설정 탭에서 사용자가 다른 시트명/스프레드시트 ID를 지정하면 그걸 우선 사용)
- **열 순서 고정**: 일자, 캠페인명, 캠페인명_분할, 배리언트명_분할, XSITE, 수신, 오픈, 오픈율, 결제건수, 결제회원수, 구매전환율, 즉차거래액, 결제순매출액, 분류, 월 구분
- `lib/googleSheets.ts`가 fetch 직후 헤더 행이 이 순서와 일치하는지 검증하고, 어긋나면 에러를 던져 `useSheetData`의 `error` 상태로 노출한다 (사람이 시트를 편집하다 열을 바꿔치기해도 조용히 잘못된 숫자를 내지 않도록)
- AO 캠페인 판별: `캠페인명`이 `AO_`로 시작하는 행만 필터링

---

## 지표 정의 (Metric Definitions)

| 컬럼/지표 | 설명 |
| --- | --- |
| 수신 (`sent`) | 발송 수신자 수 |
| 오픈 (`opens`) | 오픈 수 |
| 오픈율 (`openRate`) | 오픈 ÷ 수신 |
| 결제건수 (`paymentCount`) | 결제 건 수 |
| 결제회원수 (`payingMembers`) | 결제한 회원 수 |
| 구매전환율 (`conversionRate` / `paymentRate`) | 결제건수 ÷ 수신 |
| 연관거래액 (`grossAmount`, 시트의 즉차거래액 컬럼) | FE에 표시되는 매출 지표 — 차트/표/정렬/YoY 전부 이 값 기준 |

`결제순매출액`(시트 원본, 타입상 `netRevenue`)은 원자료 보존을 위해 `AoPushRow`에는 파싱해두지만, 어떤 집계 함수나 화면에도 노출하지 않는다 — 매출로 보여줄 값은 항상 즉차거래액(`grossAmount`, FE 표기 "연관거래액")이다.

집계(일/주/월/기간/캠페인 등) 단위의 비율 지표(오픈율, 구매전환율 등)는 항상 합산된 원시 카운트(수신/오픈/결제건수 등)로부터 재계산하며, 시트가 이미 제공하는 비율 컬럼(`openRate`, `conversionRate`)을 그대로 평균 내지 않는다 — `lib/metrics.ts`의 `sumAoMetrics` + 파생 비율 계산 참고.

---

## 포맷팅 규칙

- **Rate 계산값** (오픈율, 구매전환율 등): 소수점 셋째자리에서 반올림 → 둘째자리까지 표기 (예: 12.34%)
- **숫자**: K / M / B 단위 축약 없이 전체 숫자 표기 (예: 1,500, 1,200,000)
- **단가성 지표** (거래액, 매출 등): 정수로만 표기, 첫째자리 소수점에서 반올림 (예: ₩12,345)

`lib/formatters.ts`에 `formatNumber`, `formatCurrency`, `formatCountWithRate` 함수로 중앙 관리한다.

---

## 알려진 함정 (Gotchas)

- **NODE_ENV=production 고정**: 이 환경은 `NODE_ENV=production`으로 고정되어 있음. `npm install` 시 반드시 `--include=dev` 플래그 필요. 스크립트 실행 시 `NODE_ENV=development` 접두사 필요
- **Tailwind v4 `border-border` 오류**: shadcn/ui 기본 `index.css`의 `@apply border-border` 줄을 삭제해야 함. Tailwind v4에서 빌드 오류 발생
- **nullish coalescing 혼용 시 괄호 필수**: `a || b ?? c` 패턴은 `a || (b ?? c)`로 괄호 명시. `tsc`는 통과해도 `vite build`에서 오류 발생
- **빈 문자열로 Date 생성 금지**: `new Date('').toISOString()` 호출 시 `RangeError` → React 흰 화면. 날짜 함수에 항상 Invalid Date 방어 처리 필요
- **Vercel 배포 시 Co-Authored-By 태그 제거**: 커밋 메시지에 `Co-Authored-By` 태그가 있으면 Vercel Hobby에서 배포 차단됨
- **Google Sheets API 키는 VITE_ prefix 사용 금지**: `VITE_` 변수는 브라우저 번들에 그대로 노출됨. `SPREADSHEET_ID`/`GOOGLE_SHEETS_API_KEY`는 반드시 서버 전용(`api/sheets.ts`, dev 프록시)으로만 접근

---

## 코딩 컨벤션

- 컴포넌트 파일명: PascalCase (예: `KpiCard.tsx`)
- 훅 파일명: camelCase + `use` 접두사 (예: `useSheetData.ts`)
- 유틸/lib 파일명: camelCase (예: `formatters.ts`)
- **지표 계산 로직은 컴포넌트 안에 인라인으로 쓰지 않는다** → `lib/metrics.ts`에 순수 함수로 분리
- shadcn/ui 컴포넌트(`src/components/ui/`)는 직접 수정하지 않는다
- 서버 전용 환경변수는 `process.env.*` 형식으로만 접근한다 (`VITE_` prefix 사용 금지 — 브라우저에 노출됨)
