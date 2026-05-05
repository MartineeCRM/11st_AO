import { BarChart2 } from 'lucide-react'

interface Props {
  message?: string
}

export function EmptyChartState({ message = '선택한 기간·필터에 해당하는 데이터가 없습니다.' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 h-full min-h-[120px] text-[#9CA3AF]">
      <BarChart2 className="h-8 w-8 opacity-30" />
      <p className="text-xs">{message}</p>
    </div>
  )
}
