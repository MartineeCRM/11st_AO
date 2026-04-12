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

/** YYYY-MM-DD → MM/DD */
export function formatDateShort(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  return `${m}/${d}`
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
