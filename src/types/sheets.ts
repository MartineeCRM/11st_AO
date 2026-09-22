export interface AoPushRow {
  date: string             // 일자, YYYY-MM-DD
  campaignName: string     // 캠페인명 (전체 기술명) — 'AO_' 접두사로 AO 캠페인 여부 판별
  campaignSplit: string    // 캠페인명_분할 — 사람이 읽는 캠페인명, 캠페인 목록/그룹핑 기준
  variantSplit: string     // 배리언트명_분할 — 캠페인명_분할이 같은 여러 배리언트를 구분
  xsite: string            // XSITE
  sent: number             // 수신
  opens: number            // 오픈
  openRate: number         // 오픈율 (0~1 비율로 파싱)
  paymentCount: number     // 결제건수
  payingMembers: number    // 결제회원수
  conversionRate: number   // 구매전환율 (0~1 비율로 파싱, 시트 원본값 — 집계 함수는 합산 후 재계산치를 사용)
  grossAmount: number      // 즉차거래액
  netRevenue: number       // 결제순매출액
  category: string         // 분류 (CONTEXT/BMSIGHT/MASS/#REF!/미분류) — AO 필터링에는 사용하지 않음
  monthLabel: string       // 월 구분
}

export interface DateRange {
  start: string   // YYYY-MM-DD
  end: string     // YYYY-MM-DD
}
