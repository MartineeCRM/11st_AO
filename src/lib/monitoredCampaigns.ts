async function errorMessage(res: Response, fallback: string): Promise<string> {
  const json = await res.json().catch(() => ({}))
  return typeof json.error === 'string' ? json.error : fallback
}

export async function fetchMonitoredCampaigns(spreadsheetId: string): Promise<string[]> {
  const params = new URLSearchParams()
  if (spreadsheetId) params.set('spreadsheetId', spreadsheetId)
  const res = await fetch(`/api/monitored-campaigns?${params.toString()}`)
  if (!res.ok) throw new Error(await errorMessage(res, '모니터링 대상 불러오기 실패'))
  const json = await res.json()
  return Array.isArray(json.campaigns) ? json.campaigns.filter((c: unknown): c is string => typeof c === 'string') : []
}

export async function saveMonitoredCampaigns(spreadsheetId: string, campaigns: string[]): Promise<void> {
  const res = await fetch('/api/monitored-campaigns', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spreadsheetId, campaigns }),
  })
  if (!res.ok) throw new Error(await errorMessage(res, '모니터링 대상 저장 실패'))
}
