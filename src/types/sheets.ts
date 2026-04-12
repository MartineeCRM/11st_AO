export interface MartineeUnionRow {
  date: string                  // YYYY-MM-DD
  campaign_id?: string
  campaign_name: string
  canvas_name?: string
  variant_depth_1: string
  os: string
  sent: number
  impression: number
  total_opens: number
  first_button_clicks: number
  second_button_clicks: number
  body_clicks: number
  conversion_a: number
  revenue: number
  unique_recipient: number
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
}

export interface DateRange {
  start: string   // YYYY-MM-DD
  end: string     // YYYY-MM-DD
}

export interface FilterState {
  dateRange: DateRange
  variantDepth1: string[]   // empty = all
  os: string[]              // empty = all
}
