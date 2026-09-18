import type { MartineeUnionRow } from '@/types/sheets'

function demoRow(date: string, campaign: string, sent: number, conversionA: number, revenue: number): MartineeUnionRow {
  return {
    date,
    app: 'demo',
    campaign_type: 'AO',
    category: '',
    channel: 'push',
    os: 'Android',
    message_type: '',
    message_name: '',
    delivery_type: '',
    campaign_name: campaign,
    message_action: '',
    sent,
    deliveries: 0,
    impressions: 0,
    unique_impressions: 0,
    unique_recipients: sent,
    body_clicks: 0,
    bounces: 0,
    total_opens: 0,
    direct_opens: 0,
    influenced_opens: 0,
    first_button_clicks: 0,
    second_button_clicks: 0,
    conversion_a: conversionA,
    conversion_b: Math.round(conversionA * 0.6),
    conversion_c: Math.round(conversionA * 0.3),
    conversion_d: Math.round(conversionA * 0.1),
    revenue,
    imps: 0,
    sent_calc: sent,
    campaign_depth_1: campaign,
    campaign_depth_2: '',
    variant_depth_1: '',
    variant_depth_2: '',
    cg_tg: '',
    clicks: 0,
  }
}

/**
 * 화면 미리보기 전용 가짜 AO 데이터 — 실제 시트/DB에는 절대 쓰지 않는다.
 * referenceDate 기준 과거 20개월치를 만들어 연도 경계를 넘는 장기 캠페인 시나리오를 재현한다.
 */
export function generateDemoAoRows(referenceDate: string): MartineeUnionRow[] {
  const [y, m] = referenceDate.slice(0, 7).split('-').map(Number)
  const campaigns = ['(샘플) 장바구니 담기 유도', '(샘플) 첫구매 유도']
  const rows: MartineeUnionRow[] = []

  for (let i = 0; i < 20; i++) {
    const total = y * 12 + (m - 1) - i
    const yy = Math.floor(total / 12)
    const mm = (total % 12) + 1
    const dateStr = `${yy}-${String(mm).padStart(2, '0')}-10`

    campaigns.forEach((campaign, ci) => {
      const base = 100 + i * 5 + ci * 30
      rows.push(demoRow(dateStr, campaign, base, Math.round(base * 0.1), base * 100))
    })
  }

  return rows
}
