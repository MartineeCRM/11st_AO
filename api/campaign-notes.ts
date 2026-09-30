import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

function keyOf(spreadsheetId: string): string {
  return `notes:${spreadsheetId || 'default'}`
}

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const redis = getRedis()

  if (req.method === 'GET') {
    const { spreadsheetId } = req.query as Record<string, string>
    if (!redis) {
      console.error('[campaign-notes] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not configured')
      return res.status(200).json({})
    }
    try {
      const notes = await redis.hgetall<Record<string, string>>(keyOf(spreadsheetId ?? ''))
      res.setHeader('Cache-Control', 'private, no-store')
      return res.status(200).json(notes ?? {})
    } catch (err) {
      console.error('[campaign-notes] read failed', err)
      return res.status(200).json({})
    }
  }

  if (req.method === 'PUT') {
    const { spreadsheetId, campaign, note } = (req.body ?? {}) as { spreadsheetId?: string; campaign?: string; note?: string }
    if (!campaign) {
      return res.status(400).json({ error: 'campaign이 필요합니다.' })
    }
    if (!redis) {
      console.error('[campaign-notes] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not configured')
      return res.status(500).json({ error: '메모 저장 기능이 아직 설정되지 않았습니다.' })
    }
    try {
      await redis.hset(keyOf(spreadsheetId ?? ''), { [campaign]: note ?? '' })
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error('[campaign-notes] write failed', err)
      return res.status(500).json({ error: '메모 저장에 실패했습니다.' })
    }
  }

  res.setHeader('Allow', 'GET, PUT')
  return res.status(405).json({ error: 'Method not allowed' })
}
