export interface KpiCardData {
  label: string
  value: number
  formattedValue: string
  wow: number           // ratio: 0.05 = +5%
  trendData: number[]   // 14-day daily values (oldest → newest)
  icon: string          // lucide icon name
  isRate?: boolean
  isCurrency?: boolean
}

export interface DailyMetricPoint {
  date: string
  sentImpression: number
  ctr: number
  cvr: number
}

export interface Top10Item {
  name: string
  value: number
  formattedValue: string
  type: 'campaign' | 'canvas'
}

export type Top10Metric = '구매 CVR' | 'Revenue' | '발송/노출량' | '오픈/클릭율' | 'CTR' | 'AOV'

export interface FunnelStep {
  label: string
  field: string
  value: number
  rate: number | null   // conversion rate from previous step
}

export interface BusinessKpiRow {
  metric: string
  field: string
  current: number
  formattedCurrent: string
  wow: number | null
  mom: number | null
  yoy: number | null
  trend: number[]       // 30-day daily values
  isRate?: boolean
  isCurrency?: boolean
  isFullNumber?: boolean
}

export interface OptInData {
  label: string
  icon: string
  value: number
  wow: number
  trendData: number[]
  color: string
}

export interface DailyComboPoint {
  date: string
  sentImpression: number
  ctr: number
  cvr: number
}

export interface DailyRevenuePoint {
  date: string
  revenue: number
  aov: number
  revenuePerSend: number
  expectedReward: number
}
