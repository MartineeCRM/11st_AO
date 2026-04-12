# CRM 대시보드 지표 및 계산식 가이드 (METRICS.md)

이 문서는 CRM 대시보드에 표시되는 주요 지표와 차트의 계산 방식 및 사용된 데이터를 정의합니다.

---

## 1. 상단 KPI 요약 카드 (Row 1)

| 지표명 | 계산 방식 (Formula) | 사용 데이터 필드 |
| :--- | :--- | :--- |
| **푸시 수신동의** | `선택 기간 push_opt_in의 평균` | `daily_kpi.push_opt_in` |
| **DAU** | `선택 기간 dau의 평균` | `daily_kpi.dau` |
| **MAU** | `선택 기간의 마지막 날짜 mau 값` | `daily_kpi.mau` |
| **Revenue (매출)** | `선택 기간 revenue의 합계` | `daily_kpi.revenue` |
| **전체 발송/노출** | `선택 기간 (sent + impression)의 합계` | `martinee_union.sent`, `martinee_union.impression` |
| **전체 평균 CTR** | `(오픈 + 클릭 수) / (발송 + 노출 수)` | `martinee_union` 내 모든 클릭/오픈 및 발송 필드 |
| **유저당 메시지 수** | `(발송 + 노출 수) / unique_recipient 합계` | `martinee_union.unique_recipient` |

---

## 2. 일별 발송/노출 및 반응률 추이 (Row 2 왼쪽)

| 지표명 | 계산 방식 (Formula) | 사용 데이터 필드 |
| :--- | :--- | :--- |
| **발송/노출량** | `일별 (sent + impression) 합계` | `martinee_union.sent`, `martinee_union.impression` |
| **CTR (클릭율)** | `(오픈 + 클릭 합계) / (발송 + 노출 합계)` | `total_opens`, `body_clicks` 등 모든 클릭성 필드 |
| **구매 CVR** | `conversion_a / (발송 + 노출 합계)` | `martinee_union.conversion_a` |

---

## 3. 캠페인 성과 Top 10 (Row 2 오른쪽)

| 지표명 | 계산 방식 (Formula) | 비고 |
| :--- | :--- | :--- |
| **발송/노출량** | `캠페인별 (sent + impression) 합계` | |
| **오픈/클릭율** | `캠페인별 모든 오픈 및 클릭 필드 합계` | |
| **CTR** | `캠페인별 (오픈 + 클릭) / (발송 + 노출)` | |
| **구매 CVR** | `캠페인별 conversion_a / (발송 + 노출)` | |
| **Revenue** | `캠페인별 revenue 합계` | |
| **AOV (객단가)** | `캠페인별 revenue 합계 / conversion_a 합계` | 캠페인 단위 성과 매출을 전환 수로 나눔 |

---

## 4. 전환 퍼널 (Row 3)

- **단계별 수치**: 선택된 필드(DAU, 제품 상세 조회, 구매 건수 등)의 선택 기간 합계
- **전환율 (Rate)**: `(현재 단계 수치) / (이전 단계 수치)`
- **사용 데이터**: `daily_kpi`의 `dau`, `view_product_detail`, `purchase_cnt` 등

---

## 5. 비즈니스 지표 테이블 (Row 4 왼쪽)

이 테이블은 현재 기간 수치와 함께 **WoW(Week-on-Week)**를 계산하여 보여줍니다.

| 지표명 | 상세 계산 방식 | 사용 데이터 |
| :--- | :--- | :--- |
| **Revenue** | `선택 기간 revenue 합계` | `daily_kpi.revenue` |
| **DAU / MAU** | `선택 기간 각 지표의 합계` | `daily_kpi.dau`, `daily_kpi.mau` |
| **AOV (객단가)** | `기간 전체 매출 / 전체 구매 건수` | `revenue`, `purchase_cnt` |
| **ARPU (유저당 매출)** | `기간 전체 매출 / 전체 DAU 합계` | `revenue`, `dau` |
| **ARPPU (결제유저 매출)** | `기간 전체 매출 / 구매 건수 (결제유저 대용)` | `revenue`, `purchase_cnt` |
| **활성 대비 구매 비중** | `구매 건수 합계 / DAU 합계` | `purchase_cnt`, `dau` |

---

## 6. 수익성 및 효율성 추이 차트 (Row 5)

| 지표명 | 계산 방식 (Formula) | 사용 데이터 필드 |
| :--- | :--- | :--- |
| **Revenue** | `일별 매출 합계` | `daily_kpi.revenue` 또는 `martinee_union.revenue` |
| **AOV** | `일별 매출 / 일별 구매 건수` | `daily_kpi.purchase_cnt` |
| **발송당 Revenue** | `일별 매출 / 일별 (발송 + 노출 합계)` | `martinee_union.sent`, `impression` |
| **예상 Reward** | `CTR * 구매 CVR * 100` | 캠페인 반응률과 구매 전환율의 곱 |

---

## 용어 정의 및 데이터 출처

- **Martinee Union**: 마케팅 발송 및 캠페인 반응 데이터 (구글 시트 `martinee_union` 탭)
- **Daily KPI**: 앱 전체 활성 및 비즈니스 성과 데이터 (구글 시트 `daily_kpi` 탭)
- **WoW (Week on Week)**: `(현재 기간 수치 - 전주 동일 기간 수치) / 전주 동일 기간 수치`
