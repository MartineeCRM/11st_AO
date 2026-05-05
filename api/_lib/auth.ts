import { createClient } from '@supabase/supabase-js'
import type { IncomingMessage, ServerResponse } from 'http'

const supabaseUrl = process.env.SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// service_role bypasses RLS — server-side only, never exposed to client
function getAdminClient() {
  return createClient(supabaseUrl, serviceRoleKey)
}

interface ProjectConfig {
  id: string
  name: string
  spreadsheet_id: string
  google_api_key: string
  braze_api_key: string | null
  braze_base_url: string | null
  chart_colors: string[]
  metric_definitions: { col: string; label: string }[]
}

interface AuthResult {
  userId: string
  projectId: string
  project: ProjectConfig
}

// 5분 TTL 캐시 — 매 요청마다 Supabase DB 조회 방지
const projectCache = new Map<string, { config: ProjectConfig; cachedAt: number }>()
const CACHE_TTL = 5 * 60 * 1000

export async function verifyProjectAccess(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<AuthResult | null> {
  const authHeader = req.headers['authorization']
  const projectId = req.headers['x-project-id'] as string | undefined

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.writeHead(401, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Missing authorization header' }))
    return null
  }

  if (!projectId) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Missing X-Project-Id header' }))
    return null
  }

  const jwt = authHeader.replace('Bearer ', '')

  // JWT 검증 — anon key로 user 확인 (RLS 적용됨)
  const userClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })
  const { data: { user }, error: userError } = await userClient.auth.getUser()

  if (userError || !user) {
    res.writeHead(401, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Invalid or expired token' }))
    return null
  }

  // 캐시 확인
  const cacheKey = `${user.id}:${projectId}`
  const cached = projectCache.get(cacheKey)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return { userId: user.id, projectId, project: cached.config }
  }

  // 권한 확인 + 프로젝트 설정 조회
  const admin = getAdminClient()
  const { data: membership } = await admin
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    res.writeHead(403, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Access denied to this project' }))
    return null
  }

  const { data: project, error: projError } = await admin
    .from('projects')
    .select('id, name, spreadsheet_id, google_api_key, braze_api_key, braze_base_url, chart_colors, metric_definitions')
    .eq('id', projectId)
    .single()

  if (projError || !project) {
    res.writeHead(503, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Failed to load project configuration' }))
    return null
  }

  projectCache.set(cacheKey, { config: project as ProjectConfig, cachedAt: Date.now() })
  return { userId: user.id, projectId, project: project as ProjectConfig }
}
