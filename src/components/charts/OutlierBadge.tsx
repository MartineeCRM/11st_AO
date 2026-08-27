import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatKorean } from '@/lib/formatters'
import type { OutlierResult } from '@/lib/outlier'

interface SeriesOutlier {
  label: string
  result: OutlierResult
}

interface Props {
  series: SeriesOutlier[]
  className?: string
}

/** 이상치 배지 — 호버 시 어떤 지표가 왜 이상치로 감지됐는지 보여준다 */
export function OutlierBadge({ series, className }: Props) {
  const [hovered, setHovered] = useState(false)
  const triggered = series.filter(s => s.result.hasOutlier)
  if (triggered.length === 0) return null

  return (
    <div
      className={cn('relative shrink-0', className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="cursor-default rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-medium text-[#92400E]">
        ⚠ 이상치
      </span>
      {hovered && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-64 rounded-[18px] border border-[#e0e0e0] bg-white p-3 shadow-lg">
          <p className="mb-1.5 text-[11px] font-medium text-[#6B7280]">이상치 감지 사유</p>
          <ul className="flex flex-col gap-1.5">
            {triggered.map(s => (
              <li key={s.label} className="text-xs leading-snug text-[#1d1d1f]">
                <span className="font-semibold">{s.label}</span> 최댓값 {formatKorean(Math.round(s.result.rawMax))} — 기준선{' '}
                {formatKorean(Math.round(s.result.fence))} 초과로 Y축 클리핑됨
                {s.result.outlierCount > 1 && ` (${s.result.outlierCount}건)`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
