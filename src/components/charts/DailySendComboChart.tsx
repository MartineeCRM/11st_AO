import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { DailyComboPoint } from '@/types/metrics'
import { formatKorean } from '@/lib/formatters'
import { EmptyChartState } from '@/components/EmptyChartState'
import { useChartNotes } from '@/hooks/useChartNotes'
import { NoteMarker } from './ChartNoteOverlay'
import { useChartColors } from '@/lib/chartColors'

interface Props {
  data: DailyComboPoint[]
}

// Recharts customized dot — note marker per data point
function NoteDot(props: {
  cx?: number
  cy?: number
  payload?: { date: string }
  notes: Map<string, import('@/hooks/useChartNotes').ChartNote>
  onSave: (date: string, text: string) => void
  onDelete: (date: string) => void
}) {
  const { cx, cy, payload, notes, onSave, onDelete } = props
  if (cx == null || cy == null || !payload) return null
  return (
    <NoteMarker
      cx={cx}
      cy={cy}
      date={payload.date}
      note={notes.get(payload.date)}
      onSave={onSave}
      onDelete={onDelete}
    />
  )
}

export function DailySendComboChart({ data }: Props) {
  const colors = useChartColors()
  const { notes, upsertNote, deleteNote } = useChartNotes('daily_send')

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 flex flex-col h-full">
      <h3 className="mb-4 text-sm font-semibold text-[#111827]">일별 발송량 / CTR / CVR 추이</h3>
      <div className="flex-1 min-h-0">
        {data.length === 0 ? <EmptyChartState /> : <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 24, right: 48, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            {/* 왼쪽 Y축: 발송/노출 */}
            <YAxis
              yAxisId="left"
              tickFormatter={v => formatKorean(v as number)}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            {/* 오른쪽 Y축: CTR / CVR (%) */}
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={v => `${v}%`}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === '발송/노출') return [formatKorean(value), name]
                return [`${value.toFixed(2)}%`, name]
              }}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
            />
            <Legend
              iconSize={10}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Bar
              yAxisId="left"
              dataKey="sentImpression"
              name="발송/노출"
              fill={colors[0] + '66'}
              radius={[2, 2, 0, 0]}
              maxBarSize={20}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="ctr"
              name="CTR"
              stroke={colors[0]}
              strokeWidth={2}
              dot={(props) => <NoteDot {...props} notes={notes} onSave={upsertNote} onDelete={deleteNote} />}
              activeDot={{ r: 4 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cvr"
              name="CVR"
              stroke={colors[2]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>}
      </div>
    </div>
  )
}
