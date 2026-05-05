# Project Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대시보드 TopNav 우상단에 프로젝트 전환 드롭다운을 추가해, 로그인 상태에서 권한 있는 프로젝트 간에 자유롭게 전환할 수 있게 한다.

**Architecture:** `ProtectedRoute`의 render-prop을 확장해 `availableProjects`와 `setProjectId`를 노출하고, `App.tsx`가 이를 `TopNav`에 전달한다. `TopNav`는 프로젝트가 2개 이상일 때 클릭 가능한 드롭다운을 렌더링하고, 1개일 때는 기존 배지를 그대로 표시한다.

**Tech Stack:** React, TypeScript, Tailwind CSS, Lucide React

---

## 파일 변경 목록

| 파일 | 변경 내용 |
|------|-----------|
| `src/components/ProtectedRoute.tsx` | children render-prop 타입 확장 — `project` 단독 → `{ project, availableProjects, setProjectId }` |
| `src/App.tsx` | render-prop 구조분해 변경, TopNav에 새 props 전달 |
| `src/components/TopNav.tsx` | `projectName` 배지 → `project` + `availableProjects` + `onProjectChange` 기반 드롭다운 |

---

## Task 1: ProtectedRoute render-prop 타입 확장

**Files:**
- Modify: `src/components/ProtectedRoute.tsx`

- [ ] **Step 1: Props 인터페이스 수정**

`src/components/ProtectedRoute.tsx`의 `Props` 인터페이스와 `children` 호출부를 아래와 같이 변경한다.

```tsx
// 변경 전
interface Props {
  children: (project: Project) => ReactNode
}

// 변경 후
interface ProjectContext {
  project: Project
  availableProjects: Project[]
  setProjectId: (id: string) => void
}

interface Props {
  children: (ctx: ProjectContext) => ReactNode
}
```

- [ ] **Step 2: children 호출부 수정**

파일 맨 아래 `return <>{children(project)}</>` 를 아래로 교체한다.

```tsx
return <>{children({ project, availableProjects, setProjectId })}</>
```

- [ ] **Step 3: 타입 체크**

```bash
NODE_ENV=development npx tsc --noEmit
```

예상 결과: `App.tsx`에서 타입 오류 발생 (아직 수정 전이므로 정상). ProtectedRoute 자체 오류는 없어야 한다.

- [ ] **Step 4: 커밋**

```bash
git add src/components/ProtectedRoute.tsx
git commit -m "refactor: expose availableProjects and setProjectId from ProtectedRoute render-prop"
```

---

## Task 2: App.tsx render-prop 구조분해 및 TopNav props 전달

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: render-prop 구조분해 변경 및 TopNav props 추가**

`App.tsx`의 `ProtectedRoute` 블록 전체를 아래로 교체한다.

```tsx
export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('performance')

  return (
    <ProtectedRoute>
      {({ project, availableProjects, setProjectId }) => (
        <div className="min-h-screen bg-[#F4F5F7]">
          <TopNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
            project={project}
            availableProjects={availableProjects}
            onProjectChange={setProjectId}
          />
          <main>
            <ErrorBoundary>
              {activeTab === 'performance' && <CRMPerformance />}
              {activeTab === 'attribution' && <CRMAttribution />}
              {activeTab === 'ops' && <CRMCampaignOps />}
              {activeTab === 'settings' && <CRMSettings project={project} />}
            </ErrorBoundary>
          </main>
        </div>
      )}
    </ProtectedRoute>
  )
}
```

- [ ] **Step 2: 타입 체크**

```bash
NODE_ENV=development npx tsc --noEmit
```

예상 결과: `TopNav`의 `projectName` prop이 아직 남아있어 타입 오류 발생 (정상, Task 3에서 해결).

- [ ] **Step 3: 커밋**

```bash
git add src/App.tsx
git commit -m "refactor: pass availableProjects and onProjectChange to TopNav"
```

---

## Task 3: TopNav 프로젝트 전환 드롭다운 구현

**Files:**
- Modify: `src/components/TopNav.tsx`

- [ ] **Step 1: TopNav.tsx 전체 교체**

`src/components/TopNav.tsx` 내용을 아래로 완전히 교체한다.

```tsx
import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Project } from '@/lib/supabase'

type Tab = 'performance' | 'attribution' | 'ops' | 'settings'

interface Props {
  activeTab: Tab
  onTabChange: (t: Tab) => void
  project: Project
  availableProjects: Project[]
  onProjectChange: (id: string) => void
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'performance', label: 'CRM 성과 모니터링' },
  { key: 'attribution', label: 'CRM Attribution' },
  { key: 'ops', label: '캠페인 운영 현황' },
  { key: 'settings', label: '설정' },
]

export function TopNav({ activeTab, onTabChange, project, availableProjects, onProjectChange }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const canSwitch = availableProjects.length >= 2

  useEffect(() => {
    if (!dropdownOpen) return
    function handleMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [dropdownOpen])

  async function handleSignOut() {
    await supabase.auth.signOut()
    localStorage.removeItem('crm_project_id')
  }

  function handleSelect(id: string) {
    onProjectChange(id)
    setDropdownOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center border-b border-[#E5E7EB] bg-white px-6">
      {/* 로고 */}
      <div className="flex items-center gap-2 mr-8">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4361EE]">
          <span className="text-xs font-bold text-white">M</span>
        </div>
        <span className="text-sm font-bold text-[#111827]">CRM Dashboard</span>
      </div>

      {/* 탭 */}
      <nav className="flex items-center gap-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={cn(
              'relative px-3 py-1.5 text-sm font-medium transition-colors',
              activeTab === key
                ? 'text-[#4361EE]'
                : 'text-[#6B7280] hover:text-[#374151]',
            )}
          >
            {label}
            {activeTab === key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#4361EE]" />
            )}
          </button>
        ))}
      </nav>

      {/* 프로젝트 전환 */}
      <div className="ml-auto flex items-center gap-3">
        <div ref={dropdownRef} className="relative">
          {canSwitch ? (
            <button
              onClick={() => setDropdownOpen(o => !o)}
              className="flex items-center gap-1.5 rounded-full bg-[#EEF2FF] px-3 py-1 text-[11px] font-medium text-[#4361EE] hover:bg-[#E0E7FF] transition-colors"
            >
              {project.name}
              <ChevronDown className={cn('h-3 w-3 transition-transform', dropdownOpen && 'rotate-180')} />
            </button>
          ) : (
            <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-medium text-[#4361EE]">
              {project.name}
            </span>
          )}

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 min-w-[160px] rounded-xl border border-[#E5E7EB] bg-white shadow-lg z-50 overflow-hidden">
              {availableProjects.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p.id)}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-[#F9FAFB]"
                >
                  <Check
                    className={cn(
                      'h-3.5 w-3.5 flex-shrink-0',
                      p.id === project.id ? 'text-[#4361EE]' : 'invisible',
                    )}
                  />
                  <span className={cn(
                    'font-medium',
                    p.id === project.id ? 'text-[#4361EE]' : 'text-[#374151]',
                  )}>
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleSignOut}
          className="text-[11px] text-[#9CA3AF] hover:text-[#374151]"
        >
          로그아웃
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: 타입 체크**

```bash
NODE_ENV=development npx tsc --noEmit
```

예상 결과: 오류 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/components/TopNav.tsx
git commit -m "feat: project switcher dropdown in TopNav"
```

---

## Task 4: 빌드 확인 및 푸시

- [ ] **Step 1: 프로덕션 빌드 확인**

```bash
NODE_ENV=development npx vite build 2>&1 | tail -20
```

예상 결과: `dist/` 생성, 오류 없음.

- [ ] **Step 2: 푸시**

```bash
git push
```
