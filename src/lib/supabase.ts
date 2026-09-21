import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type SectionId =
  | 'kpi_cards' | 'trends_top10' | 'channel_table' | 'funnel_events' | 'table_optin' | 'revenue'
  | 'att_trend' | 'att_filter' | 'att_summary' | 'att_metrics'
  | 'send_trend' | 'live_table' | 'trigger_cards' | 'scheduled_list'

export interface LayoutItem {
  id: string
  visible: boolean
}

export interface LayoutSection {
  id: SectionId
  visible: boolean
  items?: LayoutItem[]
}

export type TabKey = 'performance' | 'attribution' | 'ops' | 'ao'

export interface TabVisibility {
  performance: boolean
  attribution: boolean
  ops: boolean
  ao: boolean
}

export interface DashboardLayout {
  performance: LayoutSection[]
  attribution: LayoutSection[]
  ops: LayoutSection[]
  ao: LayoutSection[]
  tabVisibility: TabVisibility
}

export interface Project {
  id: string
  name: string
  spreadsheet_id: string
  chart_colors: string[]
  metric_definitions: { col: string; label: string }[]
  trigger_mappings: Record<string, string>
  dashboard_layout: DashboardLayout
  braze_base_url: string | null
}
