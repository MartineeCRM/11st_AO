import { useState } from 'react'
import { ChevronDown, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/formatters'
import { FUNNEL_FIELD_LABELS, type FunnelFieldKey } from '@/lib/metrics'
import type { FunnelStep } from '@/types/metrics'

const SELECTABLE_FIELDS: FunnelFieldKey[] = [
  'dau',
  'mau',
  'view_promotion_list_page',
  'view_product_detail',
  'view_cartpage',
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
        className="flex items-center gap-1 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-1 text-[11px] font-medium text-[#374151]"
      >
        {FUNNEL_FIELD_LABELS[value] ?? value}
        <ChevronDown className="h-3 w-3 text-[#9CA3AF]" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-44 rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-lg">
          {SELECTABLE_FIELDS.filter(f => !exclude.includes(f) || f === value).map(f => (
            <button
              key={f}
              onClick={() => { onChange(f); setOpen(false) }}
              className={cn(
                'block w-full px-3 py-1.5 text-left text-[11px] hover:bg-[#F9FAFB]',
                f === value ? 'font-semibold text-[#4361EE]' : 'text-[#374151]',
              )}
            >
              {FUNNEL_FIELD_LABELS[f] ?? f}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function ConversionFunnel({ data, steps, onStepsChange }: Props) {
  const maxVal = Math.max(...data.map(d => d.value), 1)

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
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 flex flex-col h-full">
      {/* 헤더 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-[#111827]">퍼널 차트</h3>
          {steps.length < 4 && (
            <button
              onClick={handleAddStep}
              className="flex items-center gap-1 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-1 text-[11px] font-medium text-[#374151] hover:bg-[#EEF1FF] hover:text-[#4361EE] hover:border-[#4361EE] transition-colors"
            >
              <Plus className="h-3 w-3" />
              단계 추가
            </button>
          )}
        </div>
        {/* 단계 드롭다운 */}
        <div className="flex items-center gap-1 flex-wrap">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-[11px] text-[#9CA3AF]">→</span>}
              <div className="flex items-center gap-0.5">
                <StepDropdown
                  value={step}
                  onChange={f => handleStepChange(i, f)}
                  exclude={steps.filter((_, j) => j !== i)}
                />
                {steps.length > 2 && (
                  <button
                    onClick={() => handleRemoveStep(i)}
                    className="rounded p-0.5 text-[#9CA3AF] hover:text-[#EF4444] transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 flex-1 justify-center">
        {data.map((step, i) => {
          const widthPct = maxVal > 0 ? (step.value / maxVal) * 100 : 0
          return (
            <div key={step.field}>
              {/* 단계 레이블 + 수치 */}
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-[#374151]">{step.label}</span>
                <span className="text-xs font-semibold text-[#111827]">{formatNumber(step.value)}</span>
              </div>
              {/* 바 */}
              <div className="h-8 w-full rounded-lg bg-[#F3F4F6] overflow-hidden relative">
                <div
                  className="h-full rounded-lg transition-all duration-500"
                  style={{
                    width: `${widthPct}%`,
                    background: i === 0
                      ? '#4361EE'
                      : `rgba(67, 97, 238, ${Math.max(0.2, 0.85 - i * 0.2)})`,
                  }}
                />
              </div>
              {/* 전환율 */}
              {step.rate !== null && (
                <div className="mt-1 flex items-center gap-1">
                  <div className="h-px flex-1 bg-[#E5E7EB]" />
                  <span className="text-[10px] font-medium text-[#6B7280]">
                    전환율 {(step.rate * 100).toFixed(1)}%
                  </span>
                  <div className="h-px flex-1 bg-[#E5E7EB]" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
