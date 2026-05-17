import { MultiSelectFilter } from '@/components/filters/MultiSelectFilter'
import { DatePresetFilter } from '@/components/filters/DatePresetFilter'
import type { Preset } from '@/components/filters/datePresets'
import type { AttributionFilterState } from '@/hooks/useAttributionFiltered'

interface Props {
  filters: AttributionFilterState
  onFiltersChange: (f: AttributionFilterState) => void
  filterOptions: {
    sourceAlias: string[]
    variantAlias: string[]
    category: string[]
    messageType: string[]
    os: string[]
  }
  minDate: string
  maxDate: string
  activePreset: Preset | null
  onPresetChange: (p: Preset | null) => void
}

export function AttributionFilterBar({
  filters,
  onFiltersChange,
  filterOptions,
  minDate,
  maxDate,
  activePreset,
  onPresetChange,
}: Props) {
  function update<K extends keyof AttributionFilterState>(key: K, value: AttributionFilterState[K]) {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="sticky top-14 z-30 flex flex-wrap items-center gap-3 border-b border-[#e0e0e0] bg-white px-6 py-3">
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
        label="Source"
        options={filterOptions.sourceAlias}
        selected={filters.sourceAlias}
        onChange={v => update('sourceAlias', v)}
      />
      <MultiSelectFilter
        label="Variant"
        options={filterOptions.variantAlias}
        selected={filters.variantAlias}
        onChange={v => update('variantAlias', v)}
      />
      <MultiSelectFilter
        label="분류"
        options={filterOptions.category}
        selected={filters.category}
        onChange={v => update('category', v)}
      />
      <MultiSelectFilter
        label="Message Type"
        options={filterOptions.messageType}
        selected={filters.messageType}
        onChange={v => update('messageType', v)}
      />
      <MultiSelectFilter
        label="OS"
        options={filterOptions.os}
        selected={filters.os}
        onChange={v => update('os', v)}
      />
    </div>
  )
}
