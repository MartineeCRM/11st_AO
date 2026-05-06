# Purchase Table Enhancements — Design Spec
_2026-05-06_

## 목표

Attribution 탭의 일자별 구매 지표 테이블에 세 가지 기능을 추가한다.
1. 한국식 숫자 표기 (억/만 단위 축약)
2. YoY / MoM 비교 컬럼 (Revenue, 구매건수)
3. 월간 타겟 설정 + 조회일 기준 진척도 (프로그레스바 + %)

---

## 1. 한국식 숫자 표기 (`formatKorean`)

### 규칙

| 범위 | 표기 | 예시 |
|------|------|------|
| ≤ 10,000 | 전체 숫자 | `9,999` |
| 10,001 ~ 99,999,999 | X,XXX만 | `3,002만` |
| ≥ 100,000,000 | XX.X억 | `20.9억` |

- 억 단위: 소수점 한 자리 (20.85억 → 20.9억)
- 만 단위: 정수 (30,023,268 → 3,002만)

### 적용 대상

`PurchaseDataTable`의 `purchase_count`(Purchase), `revenue`(Revenue) 컬럼.
`AOV`, `ARPPU`는 단가성 지표이므로 기존 `formatCurrency` 유지.

### 구현 위치

`src/lib/formatters.ts`에 `formatKorean(n: number): string` 함수 추가.

---

## 2. YoY / MoM 컬럼

### 대상 컬럼

Revenue, purchase_count 두 컬럼 각각에 YoY/MoM 변화율 표시.

### 계산 방식

- **MoM**: 같은 기간 30일 전 데이터 대비 변화율. `offsetDate(date, -30)` 로 매핑.
- **YoY**: 같은 기간 365일 전 데이터 대비 변화율. `offsetDate(date, -365)` 로 매핑.
- 비교 데이터 없으면 `—` 표시.
- 변화율 = (현재 - 이전) / 이전.

### RowData 타입 확장

```ts
interface RowData {
  // 기존 필드...
  revenue_mom: number | null
  revenue_yoy: number | null
  purchase_mom: number | null
  purchase_yoy: number | null
}
```

### 표시

기존 WoW 배지 스타일 그대로 적용: 상승 `#10B981`, 하락 `#EF4444`, 없음 `—`.

---

## 3. 월간 타겟 설정 + 진척도

### 타겟 설정 UI

테이블 헤더 우측에 "타겟 설정" 버튼. 클릭 시 테이블 위에 인라인 패널 열림.

```
┌─ 타겟 설정 ─────────────────────────────────────────┐
│  조회 월: 2026년 5월                                  │
│  Revenue        [ 2,000,000,000 ]                   │
│  구매건수        [        50,000 ]                   │
│                              [취소]  [저장]           │
└────────────────────────────────────────────────────┘
```

- "조회 월"은 현재 필터의 endDate 기준으로 자동 결정 (`YYYY-MM` 추출).
- 입력값은 숫자만 허용 (콤마 자동 포맷팅).

### 저장 방식

`localStorage` key: `crm_monthly_targets`

```json
{
  "2026-05": { "revenue": 2000000000, "purchase_count": 50000 },
  "2026-04": { "revenue": 1800000000, "purchase_count": 45000 }
}
```

### 자동 분배

| 단위 | 타겟 계산식 |
|------|------------|
| 월간 | 저장된 값 그대로 |
| 주간 | 월간 ÷ 해당월 일수 × 7 |
| 일간 | 월간 ÷ 해당월 일수 |

### 진척도 계산

```
진척도 = 실적 누계 ÷ (일간타겟 × 경과일수)
경과일수 = min(조회기간 일수, 오늘까지 경과한 일수)
```

- 타겟 미설정 시: 진척도 컬럼 숨김.
- 100% 초과 시 바 색상 `#10B981` (초과 달성), 미만 시 `#4361EE`.
- 80% 미만 시 바 색상 `#EF4444` (위험).

### 진척도 UI

```
Revenue   ████████░░  83.2%
Purchase  ██████████  102.1%
```

- 프로그레스바: `h-1.5 rounded-full`, 배경 `#E5E7EB`
- 바 너비: `min(진척도, 100%)%` (초과분은 클리핑)
- 퍼센트 텍스트: `text-[11px] font-medium`

### 컬럼 구조 (타겟 설정 시)

Revenue 컬럼 옆에 "Revenue 진척도" 컬럼, Purchase 컬럼 옆에 "Purchase 진척도" 컬럼 추가.
월/주 그룹 행에만 표시. 일자별 하위 행에는 표시 안 함 (depth > 0).

---

## 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `src/lib/formatters.ts` | `formatKorean` 함수 추가 |
| `src/lib/purchaseTargets.ts` | 타겟 저장/로드/분배 로직 (신규) |
| `src/components/attribution/PurchaseDataTable.tsx` | YoY/MoM 컬럼, 타겟 패널, 진척도 컬럼 |

---

## 범위 밖

- Supabase 연동 (localStorage만 사용)
- Revenue 이외 지표의 타겟 설정
- 타겟 달성 알림/슬랙 연동
