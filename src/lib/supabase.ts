import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type SectionId =
  // performance tab
  | 'kpi_cards' | 'send_combo' | 'top10_bar' | 'channel_table'
  | 'funnel' | 'custom_events' | 'biz_kpi_table' | 'opt_in'
  | 'aov_revenue' | 'revenue_reward'
  // attribution tab
  | 'att_filter' | 'att_summary' | 'att_trend' | 'att_kpi_cards'
  | 'att_data_table' | 'att_roi_table' | 'att_event_metrics'
  // ops tab
  | 'send_trend' | 'live_table' | 'trigger_cards' | 'scheduled_list'

export interface LayoutSection {
  id: SectionId
  visible: boolean
}

export interface DashboardLayout {
  performance: LayoutSection[]
  attribution: LayoutSection[]
  ops: LayoutSection[]
}

export interface Project {
  id: string
  name: string
  spreadsheet_id: string
  chart_colors: string[]
  metric_definitions: { col: string; label: string }[]
  trigger_mappings: Record<string, string>
  dashboard_layout: DashboardLayout
}
