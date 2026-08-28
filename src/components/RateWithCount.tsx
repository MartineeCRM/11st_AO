import { cn } from '@/lib/utils'

interface Props {
  value: string
  countClassName?: string
}

/**
 * "12.34% (1,234)" 형태의 문자열에서 괄호 안 카운트 부분만 분리해
 * 더 작은/연한 폰트로 렌더링한다. 패턴에 안 맞으면 원본 그대로 표시.
 */
export function RateWithCount({ value, countClassName }: Props) {
  const match = value.match(/^(.+%) (\(.+\))$/)
  if (!match) return <>{value}</>

  return (
    <>
      {match[1]}{' '}
      <span className={cn('font-medium text-[#9CA3AF]', countClassName)}>{match[2]}</span>
    </>
  )
}
