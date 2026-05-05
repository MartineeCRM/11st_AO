import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })

    setLoading(false)
    if (authError) {
      setError(authError.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F5F7]">
      <div className="w-full max-w-sm rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-lg font-bold text-[#111827]">CRM Dashboard</h1>
          <p className="text-xs text-[#6B7280]">이메일로 로그인 링크를 받으세요.</p>
        </div>

        {sent ? (
          <div className="rounded-xl bg-[#EEF2FF] px-4 py-5 text-center">
            <p className="text-sm font-semibold text-[#4361EE]">이메일을 확인하세요</p>
            <p className="mt-1 text-xs text-[#6B7280]">
              <span className="font-medium">{email}</span>으로 로그인 링크를 보냈습니다.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="이메일 주소"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none focus:border-[#4361EE] focus:ring-2 focus:ring-[#EEF2FF]"
            />
            {error && <p className="text-xs text-[#EF4444]">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-[#4361EE] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? '전송 중...' : '로그인 링크 받기'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
