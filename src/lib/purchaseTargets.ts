const STORAGE_KEY = 'crm_monthly_targets'

export interface MonthlyTarget {
  revenue: number
  purchase_count: number
}

type TargetStore = Record<string, MonthlyTarget>

export function loadTargets(): TargetStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as TargetStore) : {}
  } catch {
    return {}
  }
}

export function saveTarget(monthKey: string, target: MonthlyTarget): void {
  const store = loadTargets()
  store[monthKey] = target
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function getTarget(monthKey: string): MonthlyTarget | null {
  return loadTargets()[monthKey] ?? null
}

/** 월간 타겟을 일간/주간으로 분배 */
export function distributeTarget(
  monthKey: string,
  target: MonthlyTarget,
): { daily: MonthlyTarget; weekly: MonthlyTarget } {
  const [year, month] = monthKey.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const daily: MonthlyTarget = {
    revenue: target.revenue / daysInMonth,
    purchase_count: target.purchase_count / daysInMonth,
  }
  const weekly: MonthlyTarget = {
    revenue: daily.revenue * 7,
    purchase_count: daily.purchase_count * 7,
  }
  return { daily, weekly }
}

/** 진척도 계산: 실적 ÷ (일간타겟 × 경과일수) */
export function calcProgress(
  actual: number,
  dailyTarget: number,
  elapsedDays: number,
): number | null {
  const periodTarget = dailyTarget * elapsedDays
  if (periodTarget <= 0) return null
  return actual / periodTarget
}
