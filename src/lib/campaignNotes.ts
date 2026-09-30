export async function fetchCampaignNotes(spreadsheetId: string): Promise<Record<string, string>> {
  try {
    const params = new URLSearchParams()
    if (spreadsheetId) params.set('spreadsheetId', spreadsheetId)
    const res = await fetch(`/api/campaign-notes?${params.toString()}`)
    if (!res.ok) return {}
    return (await res.json()) as Record<string, string>
  } catch {
    return {}
  }
}

export async function saveCampaignNote(spreadsheetId: string, campaign: string, note: string): Promise<void> {
  const res = await fetch('/api/campaign-notes', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spreadsheetId, campaign, note }),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(typeof json.error === 'string' ? json.error : '메모 저장 실패')
  }
}
