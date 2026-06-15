# CRM 대시보드 지표 및 계산식 가이드 (METRICS.md)

이 문서는 CRM 대시보드에 표시되는 주요 지표와 차트의 계산 방식 및 사용된 데이터를 정의합니다.

---

## 데이터 소스 컬럼 구조

### martinee_union 시트

| 컬럼명 (시트) | 내부 필드명 | 설명 |
| :--- | :--- | :--- |
| `date` | `date` | 날짜 (YYYY-MM-DD) |
| `app` | `app` | 앱 구분 |
| `campaign type` | `campaign_type` | 캠페인 타입 |
| `category` | `category` | 카테고리 |
| `channel` | `channel` | 채널 (Push, IAM 등) |
| `OS` | `os` | 운영체제 |
| `message type` | `message_type` | 메시지 타입 |
| `message name` | `message_name` | 메시지 이름 (Control Group 여부 판별에 사용) |
| `delivery type` | `delivery_type` | 발송 방식 |
| `campaign name` | `campaign_name` | 캠페인명 |
| `message action` | `message_action` | 메시지 액션 |
| `sent` | `sent` | 발송 수 |
| `deliveries` | `deliveries` | 전달 수 |
| `impressions` | `impressions` | 노출 수 |
| `unique impressions` | `unique_impressions` | 순 노출 수 |
| `unique recipients` | `unique_recipients` | 순 수신자 수 |
| `body clicks` | `body_clicks` | 바디 클릭 수 |
| `bounces` | `bounces` | 바운스 수 |
| `total opens` | `total_opens` | 전체 오픈 수 |
| `direct opens` | `direct_opens` | 직접 오픈 수 |
| `influenced opens` | `influenced_opens` | 영향받은 오픈 수 |
| `first button clicks` | `first_button_clicks` | 첫 번째 버튼 클릭 수 |
| `second button clicks` | `second_button_clicks` | 두 번째 버튼 클릭 수 |
| `conversion A` | `conversion_a` | 전환 A 수 |
| `conversion B` | `conversion_b` | 전환 B 수 |
| `conversion C` | `conversion_c` | 전환 C 수 |
| `conversion D` | `conversion_d` | 전환 D 수 |
| `revenue` | `revenue` | 매출 |
| `Imps.` | `imps` | Control Group이면 `unique_recipients`, 아니면 `impressions` (시트 계산값) |
| `Sent.` | `sent_calc` | Control Group이면 `unique_recipients`, 아니면 `sent` (시트 계산값) |
| `Campaign Depth 1` | `campaign_depth_1` | 캠페인 분류 1단계 |
| `Campaign Depth 2` | `campaign_depth_2` | 캠페인 분류 2단계 |
| `Variant Depth 1` | `variant_depth_1` | 변형 분류 1단계 |
| `Variant Depth 2` | `variant_depth_2` | 변형 분류 2단계 |
| `CG/TG` | `cg_tg` | Control Group / Target Group 구분 |
| `Clicks` | `clicks` | 전체 클릭 수 (`body_clicks + first_button_clicks + second_button_clicks`) |

> **주의**: `Imps.` / `Sent.`는 대시보드 지표 계산에 사용하지 않음. 대시보드는 원본 `impressions` / `sent` 필드를 그대로 사용.

---

## 1. 상단 KPI 요약 카드 (Row 1)

| 지표명 | 계산 방식 | 사용 데이터 필드 | 비교 기준 |
| :--- | :--- | :--- | :--- |
| **푸시 수신동의** | `endDate 이하 가장 최근 날의 push_opt_in 값` | `daily_kpi.push_opt_in` | WoW, MoM |
| **DAU** | `선택 기간 dau 평균` | `daily_kpi.dau` | WoW, MoM |
| **MAU** | `선택 기간 마지막 날 mau 값` | `daily_kpi.mau` | WoW, MoM |
| **Revenue** | `선택 기간 revenue 합계` | `daily_kpi.revenue` | WoW, MoM |
| **전체 발송/노출** | `(sent + impressions) 합계` | `martinee_union.sent`, `martinee_union.impressions` | WoW, MoM |
| **전체 평균 CTR** | `(total_opens + first_button_clicks + second_button_clicks + body_clicks) / (sent + impressions)` | `martinee_union` 클릭/오픈 및 발송 필드 전체 | WoW, MoM |
| **유저당 메시지 수** | `(sent + impressions) / unique_recipients 합계` | `martinee_union.unique_recipients` | WoW, MoM |

> **WoW**: 동일 기간 7일 전 대비 / **MoM**: 동일 기간 30일 전 대비

---

## 2. 일별 발송/노출 및 반응률 추이 (Row 2 왼쪽)

| 지표명 | 계산 방식 | 사용 데이터 필드 |
| :--- | :--- | :--- |
| **발송/노출량** | `일별 (sent + impressions) 합계` | `martinee_union.sent`, `martinee_union.impressions` |
| **오픈/클릭 수** | `일별 (total_opens + first_button_clicks + second_button_clicks + body_clicks) 합계` | `martinee_union` 오픈/클릭 필드 |
| **CTR** | `오픈/클릭 수 / 발송/노출량` | 위 두 필드 |
| **구매 CVR** | `conversion_a 합계 / (sent + impressions) 합계` | `martinee_union.conversion_a` |

---

## 3. 캠페인 성과 Top 10 (Row 2 오른쪽)

`campaign_depth_1` 기준으로 그룹핑하여 상위 10개 캠페인을 표시.

| 기준 지표 | 계산 방식 | 비고 |
| :--- | :--- | :--- |
| **발송/노출량** | `캠페인별 (sent + impressions) 합계` | |
| **오픈/클릭율** | `캠페인별 오픈 + 클릭 필드 합계` | 절댓값 기준 정렬 |
| **CTR** | `캠페인별 (오픈 + 클릭) / (sent + impressions)` | |
| **구매 CVR** | `캠페인별 conversion_a / (sent + impressions)` | |
| **Revenue** | `캠페인별 revenue 합계` | |
| **AOV** | `캠페인별 revenue 합계 / conversion_a 합계` | |

---

## 4. 전환 퍼널 (Row 3)

- **단계별 수치**: 선택된 필드의 선택 기간 합계
- **단계 간 전환율**: `현재 단계 수치 / 직전 단계 수치`
- **사용 데이터**: `daily_kpi`

선택 가능한 퍼널 스텝:

| 필드명 | 레이블 |
| :--- | :--- |
| `dau` | DAU |
| `mau` | MAU |
| `push_opt_in` | Push 수신동의 |
| `sms_opt_in` | SMS 수신동의 |
| `kakao_opt_in` | 카카오 수신동의 |
| `view_promotion_list_page` | 프로모션 조회 |
| `view_product_detail` | 제품 상세 조회 |
| `view_cartpage` | 카트 조회 |
| `like_brand` | 브랜드 좋아요 |
| `like_product` | 제품 좋아요 |
| `purchase_cnt` | 구매 건수 |
| `complete_order_product` | 구매 제품 수 |
| `first_purchase` | 첫 구매 |

---

## 5. 비즈니스 지표 테이블 (Row 4 왼쪽)

현재 기간 수치와 함께 WoW / MoM / YoY 변화율을 표시.

| 지표명 | 계산 방식 | 사용 데이터 | 포맷 |
| :--- | :--- | :--- | :--- |
| **Revenue** | `선택 기간 revenue 합계` | `daily_kpi.revenue` | ₩ 통화 |
| **DAU** | `선택 기간 dau 합계` | `daily_kpi.dau` | 정수 |
| **MAU** | `선택 기간 mau 합계` | `daily_kpi.mau` | 정수 |
| **AOV** | `기간 전체 revenue / purchase_cnt` | `revenue`, `purchase_cnt` | ₩ 정수 |
| **ARPU** | `기간 전체 revenue / DAU 합계` | `revenue`, `dau` | ₩ 정수 |
| **ARPPU** | `기간 전체 revenue / purchase_cnt` | `revenue`, `purchase_cnt` | ₩ 정수 |
| **purchase_cnt** | `선택 기간 purchase_cnt 합계` | `daily_kpi.purchase_cnt` | 정수 |
| **활성 대비 구매 비중** | `purchase_cnt 합계 / dau 합계` | `purchase_cnt`, `dau` | % |

> **WoW**: 7일 전 동일 기간 / **MoM**: 30일 전 동일 기간 / **YoY**: 365일 전 동일 기간

---

## 6. 수익성 및 효율성 추이 차트 (Row 5)

| 지표명 | 계산 방식 | 사용 데이터 필드 |
| :--- | :--- | :--- |
| **Revenue** | `일별 매출 합계` | `daily_kpi.revenue` (없으면 `martinee_union.revenue`) |
| **AOV** | `일별 revenue / 일별 purchase_cnt` | `daily_kpi.purchase_cnt` |
| **발송당 Revenue** | `일별 revenue / 일별 (sent + impressions)` | `martinee_union.sent`, `martinee_union.impressions` |
| **예상 Reward** | `CTR × 구매 CVR × 100` | 캠페인 반응률과 구매 전환율의 곱 |

---

## 용어 정의

| 용어 | 정의 |
| :--- | :--- |
| **Sent/Impression** | `sent + impressions` 합계. Push는 sent, IAM은 impressions에 기록됨 |
| **Open/Click** | `total_opens + first_button_clicks + second_button_clicks + body_clicks` 합계 |
| **CTR** | `Open/Click ÷ Sent/Impression` |
| **CVR** | `conversion_a ÷ Sent/Impression` |
| **WoW** | `(현재 - 전주 동일 기간) / 전주 동일 기간` |
| **MoM** | `(현재 - 전월 동일 기간) / 전월 동일 기간` |
| **YoY** | `(현재 - 전년 동일 기간) / 전년 동일 기간` |
| **Martinee Union** | 캠페인/채널별 발송 및 반응 데이터 (`martinee_union` 시트) |
| **Daily KPI** | 앱 전체 활성 및 비즈니스 성과 일별 집계 (`daily_kpi` 시트) |
