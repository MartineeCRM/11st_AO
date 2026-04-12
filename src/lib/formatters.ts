/** 큰 숫자를 K/M/B로 축약 (발송량, DAU 등) */
export function formatNumber(n: number): string {
  if (n === 0) return '0'
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('ko-KR')
}

/** Rate 계산값 — 소수점 셋째자리 반올림 후 둘째자리까지 % 표기 */
export function formatRate(n: number): string {
  return `${(Math.round(n * 10000) / 100).toFixed(2)}%`
}

/** 단가성 지표 전체 숫자 표기 (AOV, ARPU, ARPPU, 노출당 Rev 등) */
export function formatCurrency(n: number): string {
  return `₩${n.toLocaleString('ko-KR')}`
}

/** WoW 변화율을 "+2.3%" 형태로 표기 */
export function formatWoW(ratio: number): string {
  const pct = (Math.round(ratio * 10000) / 100).toFixed(1)
  return ratio >= 0 ? `+${pct}%` : `${pct}%`
}

/** WoW %p 변화 표기 (CTR 같은 Rate 지표) */
export function formatWoWpp(diff: number): string {
  const pp = (Math.round(diff * 10000) / 100).toFixed(2)
  return diff >= 0 ? `+${pp}%p` : `${pp}%p`
}

/**
 * 다양한 날짜 형식(YYYY-MM-DD, YYYY. MM. DD., YYYY/MM/DD 등)을
 * 일관된 YYYY-MM-DD 형식으로 변환합니다.
 */
export function normalizeDate(dateStr: string): string {
  if (!dateStr) return ''

  // 숫자 이외의 구분자들을 모두 '-'로 통일 (공백 포함 제거)
  // 예: "2026. 4. 10" -> "2026-4-10"
  // 예: "2026/04/10" -> "2026-04-10"
  let normalized = dateStr
    .trim()
    .replace(/[.\/\s]+/g, '-') // . / 공백을 -로 변경
    .replace(/-+$/, '') // 끝에 남은 - 제거

  const parts = normalized.split('-')
  if (parts.length >= 3) {
    const y = parts[0]
    const m = parts[1].padStart(2, '0')
    const d = parts[2].padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // YYYYMMDD 형태 대응 (8자리 숫자만 있는 경우)
  if (dateStr.length === 8 && /^\d+$/.test(dateStr)) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
  }

  return dateStr
}

/** YYYY-MM-DD (또는 변종) → MM/DD */
export function formatDateShort(dateStr: string): string {
  if (!dateStr) return ''
  const normalized = normalizeDate(dateStr)
  const parts = normalized.split('-')
  if (parts.length >= 3) return `${parts[1]}/${parts[2]}`
  return dateStr
}

/** Date 객체 → YYYY-MM-DD */
export function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** n일 전 날짜를 YYYY-MM-DD로 반환 */
export function daysAgo(n: number, from?: Date): string {
  const d = from ? new Date(from) : new Date()
  d.setDate(d.getDate() - n)
  return toDateStr(d)
}
