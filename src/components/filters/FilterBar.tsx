import type { FilterState } from '@/types/sheets'
import { DatePresetFilter } from './DatePresetFilter'
import { MultiSelectFilter } from './MultiSelectFilter'
import type { Preset } from './datePresets'

export type { Preset }

interface Props {
  filters: FilterState
  onFiltersChange: (f: FilterState) => void
  campaignDepth1Options: string[]
  osOptions: string[]
  minDate: string
  maxDate: string
  activePreset: Preset | null
  onPresetChange: (p: Preset | null) => void
}

export function FilterBar({
  filters,
  onFiltersChange,
  campaignDepth1Options,
  osOptions,
  minDate,
  maxDate,
  activePreset,
  onPresetChange,
}: Props) {
  return (
    <div className="sticky top-14 z-30 flex items-center gap-3 border-b border-[#E5E7EB] bg-white px-6 py-3">
      <DatePresetFilter
        value={filters.dateRange}
        onChange={dateRange => onFiltersChange({ ...filters, dateRange })}
        minDate={minDate}
        maxDate={maxDate}
        activePreset={activePreset}
        onPresetChange={onPresetChange}
      />

      <div className="h-7 w-px bg-[#E5E7EB]" />

      <MultiSelectFilter
        label="Campaign Depth 1"
        options={campaignDepth1Options}
        selected={filters.campaignDepth1}
        onChange={campaignDepth1 => onFiltersChange({ ...filters, campaignDepth1 })}
      />

      <MultiSelectFilter
        label="OS"
        options={osOptions}
        selected={filters.os}
        onChange={os => onFiltersChange({ ...filters, os })}
      />
    </div>
  )
}
