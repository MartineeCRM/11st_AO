# CLAUDE.md

## 프로젝트 개요

CRM 마케팅 운영 캠페인별 성과와 비즈니스 주요 지표를 모니터링하는 대시보드.

- **주 타겟**: CRM 마케팅 실무자
- **보조 타겟**: 팀장/이사급 의사결정권자

### 탭 구성

1. **CRM Dahsboard** (성과 모니터링) -> [DASHBOARD.md](file:///Users/gunheelee/crm_dashboard/DASHBOARD.md)
2. **CRM Attribution** (기여 분석) -> [ATTRIBUTION.md](file:///Users/gunheelee/crm_dashboard/ATTRIBUTION.md)
3. **CRM 운영 관리** (운영 효율화) -> [CRMOPS.md](file:///Users/gunheelee/crm_dashboard/CRMOPS.md)

---

## 기술 스택

| 항목 | 선택 |
| --- | --- |
| Framework | React + Vite |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Charts | Recharts |
| Data | Google Sheets API (직접 호출) |

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

## 환경변수

`.env` 파일에 설정 (고객사별로 파일을 분리해서 관리):

```text
VITE_SPREADSHEET_ID=<스프레드시트 ID>
VITE_GOOGLE_SHEETS_API_KEY=<API 키>
```

`.env` 파일은 절대 커밋하지 않는다. `.env.example`만 커밋한다.

---

## 프로젝트 구조

```text
src/
  components/
    ui/              # shadcn/ui 기본 컴포넌트 (직접 수정 금지)
    charts/          # Recharts 기반 차트 컴포넌트
    filters/         # 날짜/OS/Variant 필터 컴포넌트
    rows/            # 대시보드 열별 컴포넌트 (Row1 ~ Row5)
    cards/           # KPI 카드, 수신동의 카드 등
  hooks/
    useSheetData.ts       # Google Sheets 원본 데이터 페칭
    useFilteredData.ts    # 필터 적용 후 데이터
    useMetrics.ts         # 지표 계산 (Sent/Impression, CTR 등)
  lib/
    googleSheets.ts       # Sheets API 클라이언트
    formatters.ts         # 숫자/날짜 포맷 유틸
    metrics.ts            # 지표 계산 순수 함수
  types/
    sheets.ts             # 시트 raw 데이터 타입
    metrics.ts            # 계산된 지표 타입
  pages/
    CRMPerformance.tsx    # CRM 성과 모니터링 탭
    CRMAttribution.tsx    # CRM Attribution 탭 (추후)
```

---

## 데이터 소스

- **소스**: Google Sheets (Braze 데이터)
- **사용 시트**: `martinee_union`, `daily_kpi` (나머지 시트는 무시)

### martinee_union 시트

CRM 캠페인/캔버스별 채널 성과 데이터. 주요 컬럼:

- `Sent`, `Impression`, `Total Opens`, `First Button Clicks`, `Second Button Clicks`, `Body Clicks`
- `Conversion A`, `Revenue`, `Unique Recipient`
- `Variant Depth 1`, `OS`, 날짜 컬럼

### daily_kpi 시트

비즈니스 지표 일별 집계 데이터. 주요 컬럼:

- `push_opt_in`, `sms_opt_in`, `kakao_opt_in`
- `DAU`, `MAU`, `Revenue`, `AOV`, `ARPU`, `ARPPU`
- `purchase_cnt`, `complete_order_product`, `first_purchase`
- `like_brand`, `like_product`, `view_cartpage`, `view_product_detail`, `view_promotion_list_page`

---

## 지표 정의 (Metric Definitions)

### CRM 성과 지표 (martinee_union 기준)

| 지표 | 계산식 |
| --- | --- |
| Sent/Impression | Sent + Impression |
| Open/Click | Total Opens + First Button Clicks + Second Button Clicks + Body Clicks |
| CTR | Open/Click ÷ Sent/Impression |
| CVR | Conversion A ÷ Sent/Impression |
| 노출당 Rev | Revenue ÷ Sent/Impression |
| 유저당 메시지 수 | (Sent + Impression) ÷ Unique Recipient |
| 예상 Reward | CTR × CVR |
| 발송당 Revenue | Revenue ÷ (Sent + Impression) |

### 비즈니스 지표 (daily_kpi 기준)

| 지표 | 설명 |
| --- | --- |
| push_opt_in | 푸시 수신 동의자 수 |
| sms_opt_in | 문자 수신 동의자 수 |
| kakao_opt_in | 카카오 수신 동의자 수 |
| DAU / MAU | 일/월 활성 유저 수 |
| Revenue | 일별 매출 |
| AOV | 주문 평균 금액 |
| ARPU | 유저당 매출 |
| ARPPU | 결제 유저당 매출 |
| purchase_cnt | 구매 건 수 (주문서 단위) |
| 활성 대비 구매 비중 | purchase_cnt ÷ DAU |
| complete_order_product | 구매 제품 수 |
| first_purchase | 첫 구매 수 |
| like_brand / like_product | 브랜드/제품 좋아요 수 |
| view_cartpage | 카트 조회 수 |
| view_product_detail | 제품 상세페이지 조회 수 |
| view_promotion_list_page | 프로모션 리스트 페이지 조회 수 |

---

## 포맷팅 규칙

- **Rate 계산값** (CTR, CVR 등): 소수점 셋째자리에서 반올림 → 둘째자리까지 표기 (예: 12.34%)
- **숫자**: K / M / B 단위 축약 없이 전체 숫자 표기 (예: 1,500, 1,200,000)
- **단가성 지표** (AOV, ARPPU 등): 정수로만 표기, 첫째자리 소수점에서 반올림 (예: ₩12,345)

`lib/formatters.ts`에 `formatNumber`, `formatRate`, `formatCurrency` 함수로 중앙 관리한다.

---


## 알려진 함정 (Gotchas)

- **NODE_ENV=production 고정**: 이 환경은 `NODE_ENV=production`으로 고정되어 있음. `npm install` 시 반드시 `--include=dev` 플래그 필요. 스크립트 실행 시 `NODE_ENV=development` 접두사 필요
- **Tailwind v4 `border-border` 오류**: shadcn/ui 기본 `index.css`의 `@apply border-border` 줄을 삭제해야 함. Tailwind v4에서 빌드 오류 발생
- **nullish coalescing 혼용 시 괄호 필수**: `a || b ?? c` 패턴은 `a || (b ?? c)`로 괄호 명시. `tsc`는 통과해도 `vite build`에서 오류 발생
- **빈 문자열로 Date 생성 금지**: `new Date('').toISOString()` 호출 시 `RangeError` → React 흰 화면. 날짜 함수에 항상 Invalid Date 방어 처리 필요
- **Vercel 배포 시 Co-Authored-By 태그 제거**: 커밋 메시지에 `Co-Authored-By` 태그가 있으면 Vercel Hobby에서 배포 차단됨
- **Braze GET 요청에 Content-Type 헤더 금지**: `Content-Type: application/json`을 GET에 붙이면 CORS preflight → Braze 403. `Authorization` 헤더만 사용
- **Braze API 키는 VITE_ prefix 사용 금지**: `VITE_` 변수는 브라우저에 노출됨. 시크릿은 서버사이드 프록시로 분리 필요

---

## 코딩 컨벤션

- 컴포넌트 파일명: PascalCase (예: `KpiCard.tsx`)
- 훅 파일명: camelCase + `use` 접두사 (예: `useSheetData.ts`)
- 유틸/lib 파일명: camelCase (예: `formatters.ts`)
- **지표 계산 로직은 컴포넌트 안에 인라인으로 쓰지 않는다** → `lib/metrics.ts`에 순수 함수로 분리
- shadcn/ui 컴포넌트(`src/components/ui/`)는 직접 수정하지 않는다
- 환경변수는 `import.meta.env.VITE_*` 형식으로만 접근한다
