import { useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Settings2 } from 'lucide-react'
import { useSheetData } from '@/hooks/useSheetData'
import { useBrazeCampaigns } from '@/hooks/useBrazeCampaigns'
import { useAuth } from '@/hooks/useAuth'
import { useProject } from '@/hooks/useProject'
import { useDashboardLayout } from '@/hooks/useDashboardLayout'
import { EditModeBar } from '@/components/EditModeBar'
import { DraggableSectionWrapper } from '@/components/DraggableSectionWrapper'
import { SendOpenTrendChart } from '@/components/charts/SendOpenTrendChart'
import { LiveCampaignTable } from '@/components/LiveCampaignTable'
import { TriggerEventCards } from '@/components/TriggerEventCards'
import { ScheduledCampaignList } from '@/components/ScheduledCampaignList'
import { buildDailyComboData } from '@/lib/metrics'
import type { SectionId } from '@/lib/supabase'

export function CRMCampaignOps() {
  const { martinee, loading: sheetLoading } = useSheetData()
  const { campaigns, loading: brazeLoading, error: brazeError } = useBrazeCampaigns()
  const { user } = useAuth()
  const { project, saveTriggerMappings, saveDashboardLayout } = useProject(user?.id ?? null)

  const trendData = useMemo(
    () => (sheetLoading ? [] : buildDailyComboData(martinee, 30)),
    [martinee, sheetLoading],
  )

  const { sections, isEditing, startEditing, cancelEditing, reorder, toggleVisible, save, saving, saveError } =
    useDashboardLayout('ops', project?.dashboard_layout, saveDashboardLayout)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sections.findIndex(s => s.id === active.id)
    const newIndex = sections.findIndex(s => s.id === over.id)
    reorder(oldIndex, newIndex)
  }

  const sectionContent: Partial<Record<SectionId, React.ReactNode>> = {
    send_trend: (
      <div className="h-72">
        {sheetLoading ? (
          <div className="h-full rounded-[18px] border border-[#e0e0e0] bg-[#F3F4F6] animate-pulse" />
        ) : (
          <SendOpenTrendChart data={trendData} />
        )}
      </div>
    ),
    live_table: (
      <LiveCampaignTable
        campaigns={campaigns}
        loading={brazeLoading}
        error={brazeError}
        brazeBaseUrl={project?.braze_base_url}
      />
    ),
    trigger_cards: (
      <TriggerEventCards
        campaigns={campaigns}
        loading={brazeLoading}
        error={brazeError}
        triggerMappings={project?.trigger_mappings ?? {}}
        onSaveMappings={saveTriggerMappings}
      />
    ),
    scheduled_list: (
      <ScheduledCampaignList
        campaigns={campaigns}
        loading={brazeLoading}
        error={brazeError}
        brazeBaseUrl={project?.braze_base_url}
      />
    ),
  }

  return (
    <>
      {isEditing && (
        <EditModeBar onSave={save} onCancel={cancelEditing} saving={saving} saveError={saveError} />
      )}

      {!isEditing && (
        <div className="flex justify-end px-6 pt-4">
          <button
            onClick={startEditing}
            className="flex items-center gap-1.5 rounded-lg border border-[#e0e0e0] bg-white px-2.5 py-1.5 text-xs font-medium text-[#1d1d1f] hover:bg-[#F9FAFB]"
          >
            <Settings2 size={12} />
            레이아웃 편집
          </button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-5 px-6 py-5">
            {sections.map(section => (
              <DraggableSectionWrapper
                key={section.id}
                id={section.id}
                visible={section.visible}
                isEditing={isEditing}
                onToggleVisible={() => toggleVisible(section.id as SectionId)}
              >
                {sectionContent[section.id as SectionId]}
              </DraggableSectionWrapper>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </>
  )
}
