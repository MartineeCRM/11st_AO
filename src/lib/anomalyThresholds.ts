// WoW 변동이 이 비율을 초과하면 이상 감지 배지(⚠️)를 표시한다.
// 절댓값 기준: 0.3 = ±30% 이상 변동
export const ANOMALY_THRESHOLDS: Record<string, number> = {
  push_opt_in: 0.05,    // 수신동의는 5% 이상 변동도 이상
  dau: 0.2,
  mau: 0.1,
  revenue: 0.3,
  sentImpression: 0.3,
  ctr: 0.3,
  msgPerUser: 0.3,
  default: 0.3,
}

export function isAnomaly(metric: string, wow: number): boolean {
  const threshold = ANOMALY_THRESHOLDS[metric] ?? ANOMALY_THRESHOLDS.default
  return Math.abs(wow) >= threshold
}
