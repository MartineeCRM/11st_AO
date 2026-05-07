import { useMemo } from 'react'
import { useSheetData } from '@/hooks/useSheetData'
import { useBrazeCampaigns } from '@/hooks/useBrazeCampaigns'
import { useAuth } from '@/hooks/useAuth'
import { useProject } from '@/hooks/useProject'
import { SendOpenTrendChart } from '@/components/charts/SendOpenTrendChart'
import { LiveCampaignTable } from '@/components/LiveCampaignTable'
import { TriggerEventCards } from '@/components/TriggerEventCards'
import { ScheduledCampaignList } from '@/components/ScheduledCampaignList'
import { buildDailyComboData } from '@/lib/metrics'

export function CRMCampaignOps() {
  const { martinee, loading: sheetLoading } = useSheetData()
  const { campaigns, loading: brazeLoading, error: brazeError } = useBrazeCampaigns()
  const { user } = useAuth()
  const { project, saveTriggerMappings } = useProject(user?.id ?? null)

  const trendData = useMemo(
    () => (sheetLoading ? [] : buildDailyComboData(martinee, 30)),
    [martinee, sheetLoading],
  )

  return (
    <div className="flex flex-col gap-5 px-6 py-5">
      {/* Row 1: 발송량 & 반응 트렌드 */}
      <div className="h-72">
        {sheetLoading ? (
          <div className="h-full rounded-xl border border-[#E5E7EB] bg-[#F3F4F6] animate-pulse" />
        ) : (
          <SendOpenTrendChart data={trendData} />
        )}
      </div>

      {/* Row 2: 라이브 캠페인 현황 */}
      <LiveCampaignTable
        campaigns={campaigns}
        loading={brazeLoading}
        error={brazeError}
      />

      {/* Row 3: Action-Based 트리거 이벤트 현황 */}
      <TriggerEventCards
        campaigns={campaigns}
        loading={brazeLoading}
        error={brazeError}
        triggerMappings={project?.trigger_mappings ?? {}}
        onSaveMappings={saveTriggerMappings}
      />

      {/* Row 4: Scheduled 캠페인 현황 */}
      <ScheduledCampaignList
        campaigns={campaigns}
        loading={brazeLoading}
        error={brazeError}
      />
    </div>
  )
}
