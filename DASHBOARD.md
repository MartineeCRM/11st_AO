# CRM 성과 모니터링 (DASHBOARD.md)

## 대시보드 구조

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
