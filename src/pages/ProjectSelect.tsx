import type { Project } from '@/lib/supabase'

interface Props {
  projects: Project[]
  onSelect: (id: string) => void
}

export function ProjectSelect({ projects, onSelect }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7]">
      <div className="w-full max-w-md rounded-2xl border border-[#e0e0e0] bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-lg font-bold text-[#1d1d1f]">프로젝트 선택</h1>
        <p className="mb-6 text-xs text-[#6B7280]">열람할 고객사를 선택하세요.</p>
        <div className="flex flex-col gap-2">
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="rounded-[18px] border border-[#e0e0e0] px-5 py-4 text-left transition hover:border-[#0066cc] hover:bg-[#e8f0fb]"
            >
              <p className="text-sm font-semibold text-[#1d1d1f]">{p.name}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
