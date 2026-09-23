import { useEffect, useState } from 'react'

const STORAGE_KEY = 'crm_alert_campaigns'

function loadSelected(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === 'string') : []
  } catch {
    return []
  }
}

export function useAlertCampaignsState() {
  const [selected, setSelected] = useState<string[]>(loadSelected)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selected))
    } catch {
      // localStorage 접근 불가(프라이빗 모드 등) — 조용히 무시, 세션 내 상태는 계속 동작
    }
  }, [selected])

  function toggle(campaign: string) {
    setSelected(prev => (prev.includes(campaign) ? prev.filter(c => c !== campaign) : [...prev, campaign]))
  }

  return { selected, toggle }
}
