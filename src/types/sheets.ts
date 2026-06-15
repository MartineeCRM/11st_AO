export interface MartineeUnionRow {
  date: string                  // YYYY-MM-DD
  app: string
  campaign_type: string
  category: string
  channel: string
  os: string
  message_type: string
  message_name: string
  delivery_type: string
  campaign_name: string
  message_action: string
  sent: number
  deliveries: number
  impressions: number
  unique_impressions: number
  unique_recipients: number
  body_clicks: number
  bounces: number
  total_opens: number
  direct_opens: number
  influenced_opens: number
  first_button_clicks: number
  second_button_clicks: number
  conversion_a: number
  conversion_b: number
  conversion_c: number
  conversion_d: number
  revenue: number
  imps: number                  // Control Group이면 unique_recipients, 아니면 impressions (시트 계산값)
  sent_calc: number             // Control Group이면 unique_recipients, 아니면 sent (시트 계산값)
  campaign_depth_1: string
  campaign_depth_2: string
  variant_depth_1: string
  variant_depth_2: string
  cg_tg: string
  clicks: number                // body_clicks + first_button_clicks + second_button_clicks
}

export interface DailyKpiRow {
  date: string                        // YYYY-MM-DD
  push_opt_in: number
  sms_opt_in: number
  kakao_opt_in: number
  dau: number
  mau: number
  revenue: number
  aov: number
  arpu: number
  arppu: number
  purchase_cnt: number
  complete_order_product: number
  first_purchase: number
  like_brand: number
  like_product: number
  view_cartpage: number
  view_product_detail: number
  view_promotion_list_page: number
  [key: string]: string | number      // 시트 원본 컬럼 pass-through
}

export interface AttDataRow {
  date: string                        // YYYY-MM-DD (KST_DATE)
  source_id: string
  source_type: string
  message_variation_id: string
  message_type: string                // Push | IAM
  os: string
  source_alias: string
  variant_alias: string
  category: string                    // 분류
  impression_or_send_user: number
  open_or_click_user: number
  purchase_count: number              // PURCHASE_COUNT
  purchase_item_count: number         // PURCHASE_ITEM_COUNT
  purchase_amount: number             // PURCHASE_AMOUNT
  purchase_amount_6h: number          // PURCHASE_AMOUNT_6H (있는 경우)
  extra_events: Record<string, number> // 고객사별 동적 이벤트 컬럼
}

export interface DateRange {
  start: string   // YYYY-MM-DD
  end: string     // YYYY-MM-DD
}

export interface FilterState {
  dateRange: DateRange
  campaignDepth1: string[]  // empty = all
  os: string[]              // empty = all
  category: string[]        // empty = all
  channel: string[]         // empty = all
  messageType: string[]     // empty = all
}
