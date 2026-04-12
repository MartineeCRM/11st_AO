import { useState } from 'react'
import { TopNav } from '@/components/TopNav'
import { CRMPerformance } from '@/pages/CRMPerformance'
import { CRMAttribution } from '@/pages/CRMAttribution'

type Tab = 'performance' | 'attribution'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('performance')

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      <TopNav activeTab={activeTab} onTabChange={setActiveTab} />
      <main>
        {activeTab === 'performance' ? <CRMPerformance /> : <CRMAttribution />}
      </main>
    </div>
  )
}
