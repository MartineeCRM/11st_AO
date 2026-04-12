# CLAUDE.md

## 프로젝트 개요

CRM 마케팅 운영 캠페인별 성과와 비즈니스 주요 지표를 모니터링하는 대시보드.

- **주 타겟**: CRM 마케팅 실무자
- **보조 타겟**: 팀장/이사급 의사결정권자

### 탭 구성

- **CRM 성과 모니터링** (현재 구현 대상)
- **CRM Attribution** (추후 구현 예정 — 지금은 탭만 표시)

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
- **큰 숫자**: K / M / B 단위 축약 (예: 1,500 → 1.5K, 1,200,000 → 1.2M)
- **예외**: 나눗셈으로 계산되는 단가성 지표 (AOV, ARPU, ARPPU, 노출당 Rev 등)는 전체 숫자 표기

`lib/formatters.ts`에 `formatNumber`, `formatRate`, `formatCurrency` 함수로 중앙 관리한다.

---

## 대시보드 구조 (CRM 성과 모니터링)

### 최상단 필터

- **날짜 프리셋**: 어제 / 최근 7일 / 최근 30일 / 전체 기간
- 전체 가능 기간을 `YYYY-MM-DD ~ YYYY-MM-DD` 형태로 표기
- **Variant Depth 1** 필터 (멀티셀렉트)
- **OS** 필터 (멀티셀렉트)

### 1열: KPI Summary 카드

표시 지표: push_opt_in, DAU, MAU, Revenue, 전체 Sent/Impression, 전체 평균 CTR, 유저당 메시지 수

- 각 지표를 박스(카드) 형태로 표시
- WoW(전주 동기간 대비) 변화율 표시
- 마우스 호버 시 최근 14일 트렌드 미니차트 툴팁 표시

### 2열: 발송 추이 & 캠페인 Top 10

- **콤보차트**: 일별 발송량(막대) + CTR + CVR(꺾은선) 추이
- **Top 10 가로형 바차트**: 드롭다운으로 기준 지표 선택
  - 선택 가능 기준: 구매 CVR, Revenue, 발송/노출량, 오픈/클릭율, CTR, AOV
  - Campaign 버전 / Canvas 버전 탭 구분
  - 세로로 길어지지 않도록 차트 높이 고정

### 3열: 퍼널 & 커스텀이벤트 추이

- **퍼널차트** (daily_kpi 기준): 최소 2뎁스, 최대 2뎁스. 드롭다운으로 지표 선택
- **커스텀이벤트 일별 라인차트**: 체크박스로 이벤트 선택
  - 대상: complete_order_product, first_purchase, like_brand, like_product, view_cartpage, view_product_detail, view_promotion_list_page

### 4열: 비즈니스 지표 테이블 & 수신동의

- **기간 비교 테이블**: WoW / MoM / YoY 비교 (가로 넓게 배치)
- **수신동의 카드**: push_opt_in / sms_opt_in / kakao_opt_in
  - 가로로 길게, 세로로 한 줄씩 쌓기
  - 마우스 호버 시 최근 14일 트렌드 미니차트 표시

### 5열: 구매 지표 & Revenue 콤보차트

- **AOV + Revenue 이중축 콤보차트**
- **발송당 Revenue + 예상 Reward 이중축 콤보차트**
  - 발송당 Revenue = Revenue ÷ (Sent + Impression)
  - 예상 Reward = CTR × CVR

---

## 코딩 컨벤션

- 컴포넌트 파일명: PascalCase (예: `KpiCard.tsx`)
- 훅 파일명: camelCase + `use` 접두사 (예: `useSheetData.ts`)
- 유틸/lib 파일명: camelCase (예: `formatters.ts`)
- **지표 계산 로직은 컴포넌트 안에 인라인으로 쓰지 않는다** → `lib/metrics.ts`에 순수 함수로 분리
- shadcn/ui 컴포넌트(`src/components/ui/`)는 직접 수정하지 않는다
- 환경변수는 `import.meta.env.VITE_*` 형식으로만 접근한다
