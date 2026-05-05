# Project Switcher — Design Spec
_2026-05-05_

## 목표

로그인한 사용자가 대시보드 안에서 권한이 있는 다른 프로젝트로 자유롭게 전환할 수 있다.
현재는 프로젝트를 바꾸려면 localStorage를 직접 지우거나 새로고침해야 한다.

---

## 현재 상태

- `useProject` — `availableProjects: Project[]`, `setProjectId(id)` 이미 구현됨
- `ProtectedRoute` — `availableProjects`를 갖고 있지만 `TopNav`에 전달하지 않음
- `TopNav` — `projectName?: string` prop만 받아 배지로 표시, 클릭 불가
- `App.tsx` — `ProtectedRoute`의 render-prop `project`만 받고, `availableProjects` / `setProjectId`는 접근 불가

---

## 설계

### 1. ProtectedRoute — prop 확장

`children` render-prop에 `project` 외에 `availableProjects`, `setProjectId`를 함께 노출한다.

```ts
// 변경 전
children: (project: Project) => ReactNode

// 변경 후
children: (ctx: {
  project: Project
  availableProjects: Project[]
  setProjectId: (id: string) => void
}) => ReactNode
```

### 2. App.tsx — TopNav에 props 전달

```tsx
<ProtectedRoute>
  {({ project, availableProjects, setProjectId }) => (
    <>
      <TopNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        project={project}
        availableProjects={availableProjects}
        onProjectChange={setProjectId}
      />
      ...
    </>
  )}
</ProtectedRoute>
```

### 3. TopNav — 프로젝트 전환 드롭다운

**Props 변경:**
```ts
// 변경 전
projectName?: string

// 변경 후
project: Project
availableProjects: Project[]
onProjectChange: (id: string) => void
```

**렌더링 규칙:**
- `availableProjects.length === 1` → 기존 배지(클릭 불가, `▾` 없음)
- `availableProjects.length >= 2` → 클릭 가능한 버튼, `▾` 표시

**드롭다운 UI:**
```
[프로젝트A ▾]
┌──────────────────────┐
│ ✓ 프로젝트A           │  ← 현재 선택, 체크 + Brand Blue 텍스트
│   프로젝트B           │  ← hover 시 bg-[#F9FAFB]
│   프로젝트C           │
└──────────────────────┘
```
- 위치: 버튼 기준 `right-0 top-full mt-1`
- 너비: `min-w-[160px]`
- 그림자: `shadow-lg`
- 외부 클릭 닫힘: `useEffect`로 `mousedown` 리스너 등록

**전환 동작:**
1. 항목 클릭 → `onProjectChange(id)` 호출
2. 드롭다운 닫힘
3. `useProject`가 새 프로젝트로 상태 업데이트 → 대시보드 데이터 자동 리프레시 (추가 코드 불필요)

---

## 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `src/components/ProtectedRoute.tsx` | children render-prop 타입 확장 |
| `src/App.tsx` | 구조분해 패턴 변경, TopNav props 추가 |
| `src/components/TopNav.tsx` | 프로젝트 드롭다운 구현 |

---

## 엣지 케이스

| 상황 | 처리 |
|------|------|
| 프로젝트 1개 | 드롭다운 없이 배지만 표시 |
| 전환 중 로딩 | 별도 스피너 없음 — `availableProjects`는 이미 메모리에 있으므로 즉시 전환 |
| 드롭다운 열린 상태에서 탭 전환 | 드롭다운 닫힘 (탭 클릭이 외부 클릭으로 처리됨) |
| 현재 프로젝트 재선택 | `setProjectId` 호출되지만 동일 ID → 상태 변화 없음 |

---

## 범위 밖 (이번 스펙에 포함하지 않음)

- 프로젝트별 역할(role) 표시
- 프로젝트 검색/필터 (프로젝트가 많을 경우 추후 추가)
- 프로젝트 전환 시 현재 탭 초기화 여부 (현재 탭 유지)
