import { useState } from 'react'
import {
  ChevronDown,
  Plus,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/formatters'
import { FUNNEL_FIELD_LABELS, type FunnelFieldKey } from '@/lib/metrics'
import type { FunnelStep } from '@/types/metrics'
import { ChartSectionNote } from './ChartSectionNote'

const SELECTABLE_FIELDS: FunnelFieldKey[] = [
  'dau',
  'push_opt_in',
  'sms_opt_in',
  'kakao_opt_in',
  'view_promotion_list_page',
  'view_product_detail',
  'view_cartpage',
  'like_brand',
  'like_product',
  'purchase_cnt',
  'complete_order_product',
  'first_purchase',
]


interface Props {
  data: FunnelStep[]
  steps: FunnelFieldKey[]
  onStepsChange: (steps: FunnelFieldKey[]) => void
}

function StepDropdown({
  value,
  onChange,
  exclude,
}: {
  value: FunnelFieldKey
  onChange: (f: FunnelFieldKey) => void
  exclude: FunnelFieldKey[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 rounded-lg border border-[#e0e0e0] bg-white px-2 py-1 text-[11px] font-medium text-[#1d1d1f] hover:bg-gray-50 transition-colors"
      >
        {FUNNEL_FIELD_LABELS[value] ?? value}
        <ChevronDown className="h-3 w-3 text-[#9CA3AF]" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-44 rounded-lg border border-[#e0e0e0] bg-white py-1 shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1">
            {SELECTABLE_FIELDS.filter(f => !exclude.includes(f) || f === value).map(f => (
              <button
                key={f}
                onClick={() => {
                  onChange(f)
                  setOpen(false)
                }}
                className={cn(
                  'block w-full px-3 py-1.5 text-left text-[11px] transition-colors',
                  f === value ? 'bg-[#e8f0fb] font-semibold text-[#0066cc]' : 'text-[#1d1d1f] hover:bg-gray-50',
                )}
              >
                {FUNNEL_FIELD_LABELS[f] ?? f}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function ConversionFunnel({ data, steps, onStepsChange }: Props) {
  function handleStepChange(i: number, f: FunnelFieldKey) {
    const next = [...steps]
    next[i] = f
    onStepsChange(next)
  }

  function handleAddStep() {
    const available = SELECTABLE_FIELDS.find(f => !steps.includes(f))
    if (available) onStepsChange([...steps, available])
  }

  function handleRemoveStep(i: number) {
    onStepsChange(steps.filter((_, j) => j !== i))
  }

  return (
    <div className="rounded-xl border border-[#e0e0e0] bg-white p-6 flex flex-col h-full overflow-hidden shadow-sm">
      {/* 범례 및 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <ChartSectionNote sectionId="perf_funnel" title="전환 퍼널 (Full-Funnel)" titleClassName="text-xl font-bold text-[#1d1d1f] tracking-tight" />
          <p className="text-[11px] text-[#64748B] font-medium uppercase tracking-wider mt-0.5">Marketing Conversion Journey</p>
        </div>
      </div>

      {/* 단계 드롭다운 조정 */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-1 flex-wrap">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-[11px] text-[#9CA3AF]">→</span>}
              <div className="flex items-center group relative">
                <StepDropdown
                  value={step}
                  onChange={f => handleStepChange(i, f)}
                  exclude={steps.filter((_, j) => j !== i)}
                />
                {steps.length > 2 && (
                  <button
                    onClick={() => handleRemoveStep(i)}
                    className="absolute -top-1.5 -right-1.5 bg-white border border-gray-200 rounded-full p-0.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 shadow-sm z-10"
                  >
                    <X className="h-2 w-2" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {steps.length < 4 && (
          <button
            onClick={handleAddStep}
            className="flex items-center gap-1 rounded-lg border border-[#e0e0e0] bg-[#F8FAFC] px-2.5 py-1.5 text-[11px] font-bold text-[#475569] hover:bg-[#e8f0fb] hover:text-[#0066cc] hover:border-[#0066cc] transition-all"
          >
            <Plus className="h-3 w-3" />
            단계 추가
          </button>
        )}
      </div>

      {/* 퍼널 메인 영역 */}
      <div className="flex-1 flex flex-col items-center justify-center py-2">
        {data.map((step, i) => {
          // 다음 단계의 rate = 현재 → 다음 전환율 → drop = (1 - rate)
          const nextRate = data[i + 1]?.rate ?? null
          const dropRate = nextRate !== null ? (1 - nextRate) * 100 : null

          // 하단으로 갈수록 카드가 좁아지는 테이퍼링 (95% -> 90% -> 85% ...)
          const widthScale = 1 - (i * 0.08)

          // 색상 결정 (Vibrant Blue -> Deep Blue -> Dark Teal -> Dark Navy)
          const colors = ['#0066cc', '#0055aa', '#004499', '#003377']
          const color = colors[i] || colors[colors.length - 1]

          return (
            <div key={step.field} className="w-full flex flex-col items-center">
              {/* 단계 카드 */}
              <div 
                className="relative rounded-2xl p-5 flex items-center justify-between shadow-lg transition-all duration-500 hover:scale-[1.02]"
                style={{ 
                  width: `${widthScale * 100}%`,
                  backgroundColor: color,
                  boxShadow: `0 10px 25px -5px ${color}40`,
                  color: 'white'
                }}
              >
                {/* 왼쪽: 이벤트명 */}
                <div className="text-base font-bold tracking-tight">
                  {step.label}
                </div>

                {/* 오른쪽: 수치 */}
                <div className="text-2xl font-extrabold tracking-tight">
                  {formatNumber(step.value)}
                </div>
              </div>

              {/* 연결부 및 드롭률 표시 (마지막 단계 제외) */}
              {i < data.length - 1 && (
                <div className="h-14 relative flex flex-col items-center">
                  <div className="w-px h-full bg-slate-200" />
                  {dropRate !== null && (
                    <div className="absolute top-1/2 -translate-y-1/2 bg-white px-2 py-0.5 border border-slate-100 rounded-full shadow-sm flex items-center gap-1">
                      <span className="text-[10px] text-red-500 font-bold">↓</span>
                      <span className="text-[10px] font-bold text-slate-600 whitespace-nowrap">
                        {dropRate.toFixed(1)}% Drop
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 하단 안내 배너 */}
      <div className="mt-8 rounded-xl bg-[#F8FAFC] border border-[#F1F5F9] py-3 px-4 text-center">
        <p className="text-[11px] font-medium text-[#64748B]">
          드롭다운에서 퍼널 지표 변경 가능 <span className="text-[#94A3B8] font-normal mx-1">|</span> <span className="text-[#0066cc] font-bold">최대 4단계</span>까지 분석 지원
        </p>
      </div>
    </div>
  )
}
