import { useEffect, useState } from 'react'

export interface SheetConnection {
  spreadsheetId: string
  sheetName: string
  apiKey: string
}

const STORAGE_KEY = 'crm_sheet_connection'
const DEFAULT_CONNECTION: SheetConnection = { spreadsheetId: '', sheetName: '', apiKey: '' }

function loadConnection(): SheetConnection {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CONNECTION
    const parsed = JSON.parse(raw)
    return {
      spreadsheetId: typeof parsed.spreadsheetId === 'string' ? parsed.spreadsheetId : '',
      sheetName: typeof parsed.sheetName === 'string' ? parsed.sheetName : '',
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
    }
  } catch {
    return DEFAULT_CONNECTION
  }
}

export function useSheetConnectionState() {
  const [connection, setConnection] = useState<SheetConnection>(loadConnection)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(connection))
    } catch {
      // localStorage 접근 불가(프라이빗 모드 등) — 조용히 무시, 세션 내 상태는 계속 동작
    }
  }, [connection])

  function updateField(field: keyof SheetConnection, value: string) {
    setConnection(prev => ({ ...prev, [field]: value }))
  }

  const isConfigured = Boolean(connection.spreadsheetId && connection.sheetName && connection.apiKey)

  return { connection, updateField, isConfigured }
}
