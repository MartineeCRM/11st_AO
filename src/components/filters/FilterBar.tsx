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
  categoryOptions: string[]
  channelOptions: string[]
  messageTypeOptions: string[]
  minDate: string
  maxDate: string
  activePreset: Preset | null
  onPresetChange: (p: Preset | null) => void
  editButton?: React.ReactNode
}

export function FilterBar({
  filters,
  onFiltersChange,
  campaignDepth1Options,
  osOptions,
  categoryOptions,
  channelOptions,
  messageTypeOptions,
  minDate,
  maxDate,
  activePreset,
  onPresetChange,
  editButton,
}: Props) {
  return (
    <div className="sticky top-14 z-30 flex items-center gap-3 border-b border-[#e0e0e0] bg-white px-6 py-3">
      <DatePresetFilter
        value={filters.dateRange}
        onChange={dateRange => onFiltersChange({ ...filters, dateRange })}
        minDate={minDate}
        maxDate={maxDate}
        activePreset={activePreset}
        onPresetChange={onPresetChange}
      />

      <div className="h-7 w-px bg-[#e0e0e0]" />

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

      <MultiSelectFilter
        label="Category"
        options={categoryOptions}
        selected={filters.category}
        onChange={category => onFiltersChange({ ...filters, category })}
      />

      <MultiSelectFilter
        label="Channel"
        options={channelOptions}
        selected={filters.channel}
        onChange={channel => onFiltersChange({ ...filters, channel })}
      />

      <MultiSelectFilter
        label="Message Type"
        options={messageTypeOptions}
        selected={filters.messageType}
        onChange={messageType => onFiltersChange({ ...filters, messageType })}
      />

      {editButton && <div className="ml-auto">{editButton}</div>}
    </div>
  )
}
