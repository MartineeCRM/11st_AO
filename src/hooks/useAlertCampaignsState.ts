import { useEffect, useRef, useState } from 'react'
import { fetchMonitoredCampaigns, saveMonitoredCampaigns } from '@/lib/monitoredCampaigns'

/**
 * 모니터링 대상 캠페인(캠페인명_분할) 목록. 시트의 '모니터링_대상' 탭에 저장돼 같은 시트를 보는 모두에게 공유된다.
 * 불러오기 전/실패 시에는 ready=false로 수정을 막는다 (빈 목록으로 공유 목록을 덮어쓰지 않도록).
 */
export function useAlertCampaignsState(spreadsheetId: string) {
  const [selected, setSelected] = useState<string[]>([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saveChain = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    let cancelled = false
    setSelected([])
    setReady(false)
    setError(null)
    fetchMonitoredCampaigns(spreadsheetId)
      .then(list => {
        if (cancelled) return
        setSelected(list)
        setReady(true)
      })
      .catch(e => {
        if (!cancelled) setError(e instanceof Error ? e.message : '모니터링 대상 불러오기 실패')
      })
    return () => { cancelled = true }
  }, [spreadsheetId])

  function update(next: string[]) {
    if (!ready) return
    setSelected(next)
    // 저장 순서가 뒤바뀌지 않도록 직렬화. 실패해도 화면 상태는 유지하고, 다음 수정 때 전체 목록을 다시 저장한다
    saveChain.current = saveChain.current
      .then(() => saveMonitoredCampaigns(spreadsheetId, next))
      .then(
        () => setError(null),
        e => setError(e instanceof Error ? e.message : '모니터링 대상 저장 실패'),
      )
  }

  function toggle(campaign: string) {
    update(selected.includes(campaign) ? selected.filter(c => c !== campaign) : [...selected, campaign])
  }

  function addMany(campaigns: string[]) {
    update([...new Set([...selected, ...campaigns])])
  }

  function replace(campaigns: string[]) {
    update(campaigns)
  }

  return { selected, ready, error, toggle, addMany, replace }
}
