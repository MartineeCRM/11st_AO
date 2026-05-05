import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyProjectAccess } from './_lib/auth.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = await verifyProjectAccess(req as any, res as any)
  if (!auth) return

  const { id, name, chart_colors, metric_definitions } = auth.project

  // google_api_key, braze_api_key는 클라이언트에 절대 반환하지 않음
  return res.status(200).json({ id, name, chart_colors, metric_definitions })
}
