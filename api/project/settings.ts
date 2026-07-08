import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { verifyProjectAccess, invalidateProjectCache } from '../_lib/auth.js'

const supabaseUrl = process.env.SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getAdminClient() {
  return createClient(supabaseUrl, serviceRoleKey)
}

// GET /api/project/settings — 현재 프로젝트 설정 전체 반환 (민감 정보 포함, 프로젝트 멤버 전원)
// PATCH /api/project/settings — 설정 업데이트 (프로젝트 멤버 전원)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await verifyProjectAccess(req as any, res as any)
  if (!auth) return

  const admin = getAdminClient()

  if (req.method === 'GET') {
    const { data, error } = await admin
      .from('projects')
      .select('id, name, spreadsheet_id, google_api_key, braze_api_key, braze_base_url, chart_colors, metric_definitions, sheet_mapping')
      .eq('id', auth.projectId)
      .single()

    if (error || !data) return res.status(503).json({ error: '설정을 불러올 수 없습니다.' })
    const { google_api_key, braze_api_key, ...safeSettings } = data
    return res.status(200).json({
      ...safeSettings,
      has_google_api_key: Boolean(google_api_key),
      has_braze_api_key: Boolean(braze_api_key),
    })
  }

  if (req.method === 'PATCH') {
    const body = req.body as Record<string, unknown>
    const allowed = ['name', 'spreadsheet_id', 'google_api_key', 'braze_api_key', 'braze_base_url', 'chart_colors', 'metric_definitions', 'sheet_mapping']
    const update: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: '업데이트할 필드가 없습니다.' })
    }

    const { error } = await admin
      .from('projects')
      .update(update)
      .eq('id', auth.projectId)

    if (error) return res.status(503).json({ error: '설정 저장에 실패했습니다.' })

    invalidateProjectCache(auth.projectId)
    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', 'GET, PATCH')
  return res.status(405).json({ error: 'Method not allowed' })
}
