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
  purchase_item_count_6h: number
  purchase_count_6h: number
  purchase_user_count_6h: number
  purchase_amount_6h: number
  join_membership: number
  add_to_cart: number
  pdp_view: number
  exhibition_view: number
  push_subscribe: number
  coupon_used: number
  promo_event_complete: number
  promo_page_view: number
  plus_subscribe_start: number        // 11plus_subscribe_start
  family_member_join: number
  family_order_complete: number
  family_order_request: number
  family_order_request_received: number
  lotto_issued: number                // 11lotto_issued
  lotto_my_page_view: number          // 11lotto_my_page_view
  lotto_attendance_check: number      // 11lotto_attendance_check
  noti_setting_view: number
  my_11st_view: number
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
