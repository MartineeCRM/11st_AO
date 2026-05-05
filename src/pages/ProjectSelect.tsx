import type { Project } from '@/lib/supabase'

interface Props {
  projects: Project[]
  onSelect: (id: string) => void
}

export function ProjectSelect({ projects, onSelect }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F5F7]">
      <div className="w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-lg font-bold text-[#111827]">프로젝트 선택</h1>
        <p className="mb-6 text-xs text-[#6B7280]">열람할 고객사를 선택하세요.</p>
        <div className="flex flex-col gap-2">
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="rounded-xl border border-[#E5E7EB] px-5 py-4 text-left transition hover:border-[#4361EE] hover:bg-[#EEF2FF]"
            >
              <p className="text-sm font-semibold text-[#111827]">{p.name}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
