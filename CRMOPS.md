# CRM 운영 관리 탭 — 작업 가이드라인

**탭명:** 캠페인 운영 현황
**목적:** 현재 라이브 중인 Braze 캠페인을 실시간으로 파악하고, 발송 트렌드와 Action-Based 트리거 구조를 한눈에 모니터링

---

## 화면 구성 (3개 섹션)

### Row 1 — 발송량 & 반응 트렌드 차트

- **데이터 소스:** Google Sheets (`martinee_union`)
- **기간:** 최근 30일
- **차트 유형:** ComposedChart (Bar + Line)
  - Bar: `Sent/Impression` (파란색 `#4361EE`)
  - Line: `Open/Click` (초록색 `#10B981`)
- **관련 파일:**
  - [`src/components/charts/SendOpenTrendChart.tsx`](src/components/charts/SendOpenTrendChart.tsx)
  - [`src/lib/metrics.ts`](src/lib/metrics.ts) → `buildDailyComboData(rows, days)`

### Row 2 — 라이브 캠페인 현황

- **데이터 소스:** Braze REST API (`/campaigns/list` + `/campaigns/details`)
- **조건:** `is_active: true`, `is_archived: false`
- **채널 탭 필터:** 전체 / 푸시 / 이메일 / SMS / 카카오 / 인앱
- **테이블 컬럼:** 캠페인명, 채널(뱃지), 발송 유형, 상태, 생성일, 수정일, 상세(Braze 링크)
- **관련 파일:**
  - [`src/components/LiveCampaignTable.tsx`](src/components/LiveCampaignTable.tsx)
  - [`src/hooks/useBrazeCampaigns.ts`](src/hooks/useBrazeCampaigns.ts)

### Row 3 — Action-Based 트리거 이벤트 현황

- **데이터 소스:** Row 2와 동일 (추가 API 호출 없음)
- **필터 조건:** `schedule_type === 'action_based'`
- **그루핑 기준:** `trigger_action` 필드 (예: 장바구니 담기, 구매 완료 등)
- **카드 구성:** 트리거명 + 캠페인 수 뱃지 + 채널별 캠페인 목록(최대 5개) + Braze 링크
- **관련 파일:**
  - [`src/components/TriggerEventCards.tsx`](src/components/TriggerEventCards.tsx)

---

## 데이터 흐름

```text
Google Sheets (martinee_union)
  └─ useSheetData() → buildDailyComboData() → SendOpenTrendChart

Braze REST API
  └─ fetchAllCampaigns()         /campaigns/list (페이지네이션, 최대 500개)
       └─ fetchCampaignDetails() /campaigns/details (병렬, 최대 50개)
            └─ useBrazeCampaigns() → EnrichedCampaign[]
                 ├─ LiveCampaignTable  (전체 라이브 캠페인)
                 └─ TriggerEventCards (action_based 필터 후 그루핑)
```

---

## Braze API 연동

### 환경변수

| 변수명                       | 설명                                   |
| ---------------------------- | -------------------------------------- |
| `BRAZE_REST_ENDPOINT`        | `https://rest.iad-07.braze.com`        |
| `BRAZE_API_KEY`              | Braze REST API 키                      |

> `.env` 파일에 로컬 설정, Vercel에는 Environment Variables에 별도 등록 필요.
> API 키는 Braze 대시보드 → **Settings → API Keys**에서 관리.

### 필요 API 권한

| 권한                  | 용도                                              |
| --------------------- | ------------------------------------------------- |
| `campaigns.list`      | 전체 캠페인 목록 조회                             |
| `campaigns.details`   | 캠페인 상세 (schedule_type, trigger_action) 조회  |

### 주의사항

- Braze REST API는 서버사이드에서만 호출한다. 클라이언트는 `/api/braze/*` 내부 API 프록시만 호출한다
- Braze API 키는 `VITE_` prefix를 붙이지 않는다. `VITE_` 환경변수는 브라우저 번들에 노출될 수 있다
- GET 요청에 `Content-Type: application/json` 헤더를 **붙이지 않는다** → 브라우저 CORS preflight(OPTIONS)가 발생해 Braze가 403을 반환함
- API 클라이언트: [`src/lib/braze.ts`](src/lib/braze.ts)

---

## 캐싱 전략

- `useBrazeCampaigns` 훅은 모듈 레벨 변수(`cached`, `cachedAt`)로 캠페인 데이터를 캐싱
- TTL: **3분** — 탭 전환 시 재요청 없이 즉시 렌더링
- 캐시 만료 또는 최초 로드 시에만 Braze API 호출

---

## 채널 매핑

| Braze 채널 값                                      | 표시 레이블 | 뱃지 색상          |
| -------------------------------------------------- | ----------- | ------------------ |
| `push`, `android_push`, `ios_push`, `kindle_push`  | 푸시        | 파랑 `#4361EE`     |
| `email`                                            | 이메일      | 초록 `#15803D`     |
| `sms`                                              | SMS         | 노랑 `#D97706`     |
| `in_app_message`                                   | 인앱        | 보라 `#7C3AED`     |
| `kakao`                                            | 카카오      | 황색 `#A16207`     |

채널 레이블/색상 함수: [`src/lib/braze.ts`](src/lib/braze.ts) → `channelLabel()`, `channelBadgeColor()`

---

## 파일 구조

```text
src/
  pages/
    CRMCampaignOps.tsx          # 탭 최상위 페이지 (3개 섹션 조립)
  components/
    LiveCampaignTable.tsx        # 라이브 캠페인 테이블 (채널 탭 필터)
    TriggerEventCards.tsx        # Action-Based 트리거 카드 그리드
    charts/
      SendOpenTrendChart.tsx     # 발송/반응 트렌드 ComposedChart
  hooks/
    useBrazeCampaigns.ts         # Braze 캠페인 fetch + 캐싱 훅
  lib/
    braze.ts                     # Braze REST API 클라이언트 + 유틸 함수
```

---

## 향후 확장 포인트

- **캔버스(Canvas) 현황 추가** — `/canvas/list`, `/canvas/details` API 활용
- **발송 예정 캠페인** — `schedule_type: scheduled`인 캠페인의 다음 발송 시각 표시
- **채널별 성과 비교** — `/campaigns/data_series` API로 CTR/CVR 추이 추가
- **캠페인 검색** — 캠페인명 텍스트 필터 추가
