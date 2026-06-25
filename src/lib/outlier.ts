/**
 * IQR-based outlier detection and Y-axis domain clamping for charts.
 *
 * When a single spike dwarfs the rest of the data (e.g. ₩1B revenue day in an
 * otherwise ₩1M/day series), the chart becomes unreadable. This module:
 *  1. Computes an IQR-clipped upper bound so the Y-axis stays human-readable.
 *  2. Reports whether any point was clipped, so charts can show a badge.
 *
 * IQR fence = Q3 + 3 * IQR  (using 3× for a wide fence — only clips true spikes).
 * The lower bound is always 0 for CRM metrics (no negative values expected).
 */

export interface OutlierResult {
  /** Pass directly to Recharts YAxis `domain` prop */
  domain: [number, number]
  /** True when at least one data point exceeds the upper fence */
  hasOutlier: boolean
  /** Number of clipped points */
  outlierCount: number
  /** The raw maximum value before clamping */
  rawMax: number
  /** The computed upper fence (clipped ceiling) */
  fence: number
}

/**
 * Given an array of numeric values, compute an IQR-based Y-axis domain.
 *
 * @param values  All numeric values for a single Y-axis series.
 * @param paddingRatio  Extra headroom above the fence (default 15 %).
 * @returns OutlierResult
 */
export function calcIQRDomain(
  values: number[],
  paddingRatio = 0.15,
): OutlierResult {
  const clean = values.filter(v => Number.isFinite(v) && v >= 0)
  if (clean.length === 0) {
    return { domain: [0, 1], hasOutlier: false, outlierCount: 0, rawMax: 0, fence: 1 }
  }

  const sorted = [...clean].sort((a, b) => a - b)
  const n = sorted.length
  const rawMax = sorted[n - 1]

  // Need at least 4 points for IQR to be meaningful
  if (n < 4) {
    const ceiling = rawMax * (1 + paddingRatio) || 1
    return { domain: [0, ceiling], hasOutlier: false, outlierCount: 0, rawMax, fence: ceiling }
  }

  const q1 = sorted[Math.floor(n * 0.25)]
  const q3 = sorted[Math.floor(n * 0.75)]
  const iqr = q3 - q1

  // Wide fence (3×) — only clips genuine spikes, not normal variation
  const fence = iqr === 0 ? rawMax : q3 + 3 * iqr

  const outlierCount = clean.filter(v => v > fence).length
  const hasOutlier = outlierCount > 0

  const ceiling = hasOutlier
    ? fence * (1 + paddingRatio)
    : rawMax * (1 + paddingRatio) || 1

  return {
    domain: [0, Math.ceil(ceiling)],
    hasOutlier,
    outlierCount,
    rawMax,
    fence,
  }
}

/**
 * Extract all values for a given key from an array of data objects.
 */
export function extractValues<T extends Record<string, unknown>>(
  data: T[],
  key: keyof T,
): number[] {
  return data.map(d => Number(d[key])).filter(v => Number.isFinite(v))
}
