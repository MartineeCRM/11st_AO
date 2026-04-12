export function CRMAttribution() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EEF1FF]">
        <svg
          className="h-6 w-6 text-[#4361EE]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <p className="text-sm font-semibold text-[#374151]">준비 중입니다</p>
      <p className="text-xs text-[#9CA3AF]">CRM Attribution 기능은 곧 출시될 예정입니다.</p>
    </div>
  )
}
