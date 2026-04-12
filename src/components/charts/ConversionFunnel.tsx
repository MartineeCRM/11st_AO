import { useState } from 'react'
import {
  ChevronDown,
  Plus,
  X,
  Eye,
  MousePointerClick,
  ShoppingBag,
  ShoppingCart,
  Users,
  Target,
} from 'lucide-react'
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

const STEP_META: Record<
  string,
  { title: string; sub: string; icon: any; color: string }
> = {
  dau: { title: 'Awareness', sub: 'Daily Active Users', icon: Eye, color: '#0066FF' },
  mau: { title: 'Awareness', sub: 'Monthly Active Users', icon: Users, color: '#0066FF' },
  view_promotion_list_page: { title: 'Discovery', sub: 'Promotion List Views', icon: Target, color: '#0055DD' },
  view_product_detail: { title: 'Consideration', sub: 'Product Interactions', icon: MousePointerClick, color: '#0044BB' },
  view_cartpage: { title: 'Intent', sub: 'Cart Additions', icon: ShoppingCart, color: '#003399' },
  purchase_cnt: { title: 'Conversion', sub: 'First Purchase', icon: ShoppingBag, color: '#006D77' },
  complete_order_product: { title: 'Growth', sub: 'Product Upselling', icon: ShoppingBag, color: '#005A63' },
  first_purchase: { title: 'Conversion', sub: 'New Customer Acquisition', icon: ShoppingBag, color: '#00484F' },
}

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
        className="flex items-center gap-1 rounded-lg border border-[#E5E7EB] bg-white px-2 py-1 text-[11px] font-medium text-[#374151] hover:bg-gray-50 transition-colors"
      >
        {FUNNEL_FIELD_LABELS[value] ?? value}
        <ChevronDown className="h-3 w-3 text-[#9CA3AF]" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-44 rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1">
            {SELECTABLE_FIELDS.filter(f => !exclude.includes(f) || f === value).map(f => (
              <button
                key={f}
                onClick={() => {
                  onChange(f)
                  setOpen(false)
                }}
                className={cn(
                  'block w-full px-3 py-1.5 text-left text-[11px] transition-colors',
                  f === value ? 'bg-[#EEF2FF] font-semibold text-[#4361EE]' : 'text-[#374151] hover:bg-gray-50',
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
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 flex flex-col h-full overflow-hidden shadow-sm">
      {/* 범례 및 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[#0F172A] tracking-tight">Full-Funnel Lifecycle</h3>
          <p className="text-[11px] text-[#64748B] font-medium uppercase tracking-wider mt-0.5">Marketing Conversion Journey</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 grayscale opacity-60">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
            <span className="text-[10px] font-semibold text-[#64748B]">New Users</span>
          </div>
          <div className="flex items-center gap-1.5 grayscale opacity-60">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]" />
            <span className="text-[10px] font-semibold text-[#64748B]">Returning</span>
          </div>
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
            className="flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-[11px] font-bold text-[#475569] hover:bg-[#EEF2FF] hover:text-[#4361EE] hover:border-[#4361EE] transition-all"
          >
            <Plus className="h-3 w-3" />
            단계 추가
          </button>
        )}
      </div>

      {/* 퍼널 메인 영역 */}
      <div className="flex-1 flex flex-col items-center justify-center py-2">
        {data.map((step, i) => {
          const meta = STEP_META[step.field] || { title: step.label, sub: 'Performance', icon: Users, color: '#334155' }
          const Icon = meta.icon
          const dropRate = step.rate !== null ? (1 - step.rate) * 100 : 0
          
          // 하단으로 갈수록 카드가 좁아지는 테이퍼링 (95% -> 90% -> 85% ...)
          const widthScale = 1 - (i * 0.08)

          return (
            <div key={step.field} className="w-full flex flex-col items-center">
              {/* 단계 카드 */}
              <div 
                className="relative rounded-2xl p-4 flex items-center shadow-lg transition-all duration-500 hover:scale-[1.02]"
                style={{ 
                  width: `${widthScale * 100}%`,
                  backgroundColor: meta.color,
                  boxShadow: `0 10px 25px -5px ${meta.color}40`,
                  color: 'white'
                }}
              >
                {/* 아이콘 */}
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mr-4 backdrop-blur-md">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                
                {/* 텍스트 정보 */}
                <div className="flex-1">
                  <div className="text-sm font-bold leading-tight">{meta.title}</div>
                  <div className="text-[10px] text-white/70 font-medium">{meta.sub}</div>
                </div>

                {/* 수치 정보 */}
                <div className="text-right">
                  <div className="text-xl font-extrabold tracking-tight">{formatNumber(step.value)}</div>
                  <div className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Users</div>
                </div>
              </div>

              {/* 연결부 및 드롭률 표시 (마지막 단계 제외) */}
              {i < data.length - 1 && (
                <div className="h-14 relative flex flex-col items-center">
                  <div className="w-px h-full bg-slate-200" />
                  <div className="absolute top-1/2 -translate-y-1/2 bg-white px-2 py-0.5 border border-slate-100 rounded-full shadow-sm flex items-center gap-1 animate-in zoom-in duration-500">
                    <span className="text-[10px] text-red-500 font-bold">↓</span>
                    <span className="text-[10px] font-bold text-slate-600 whitespace-nowrap">
                      {dropRate.toFixed(1)}% Drop
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 하단 안내 배너 */}
      <div className="mt-8 rounded-xl bg-[#F8FAFC] border border-[#F1F5F9] py-3 px-4 text-center">
        <p className="text-[11px] font-medium text-[#64748B]">
          드롭다운에서 퍼널 지표 변경 가능 <span className="text-[#94A3B8] font-normal mx-1">|</span> <span className="text-[#4361EE] font-bold">최대 4단계</span>까지 분석 지원
        </p>
      </div>
    </div>
  )
}
