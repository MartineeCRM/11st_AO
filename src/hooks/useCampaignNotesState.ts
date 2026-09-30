import { useEffect, useRef, useState } from 'react'
import { fetchCampaignNotes, saveCampaignNote } from '@/lib/campaignNotes'

export type NoteSaveStatus = 'idle' | 'saved' | 'error'

export function useCampaignNotesState(spreadsheetId: string) {
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [saveStatus, setSaveStatus] = useState<Record<string, NoteSaveStatus>>({})
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    fetchCampaignNotes(spreadsheetId).then(data => {
      if (mounted.current) setNotes(data)
    })
    return () => { mounted.current = false }
  }, [spreadsheetId])

  function saveNote(campaign: string, note: string) {
    setNotes(prev => ({ ...prev, [campaign]: note }))
    saveCampaignNote(spreadsheetId, campaign, note)
      .then(() => {
        if (mounted.current) setSaveStatus(prev => ({ ...prev, [campaign]: 'saved' }))
      })
      .catch(() => {
        if (mounted.current) setSaveStatus(prev => ({ ...prev, [campaign]: 'error' }))
      })
  }

  return { notes, saveStatus, saveNote }
}
