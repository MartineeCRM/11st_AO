import { verifyProjectAccess } from '../api/_lib/auth.js'

async function readBrazeError(response) {
  const text = await response.text().catch(() => '')
  if (!text) return ''

  try {
    const json = JSON.parse(text)
    return String(json.message || json.error || json.errors || text)
  } catch {
    return text
  }
}

export async function handleBrazeProxy(req, res, brazePath, permission) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ message: 'Method not allowed' })
    return
  }

  // Supabase 인증이 설정된 경우 프로젝트별 키 사용, 없으면 .env fallback
  let endpoint, apiKey
  const hasSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY

  if (hasSupabase && req.headers['authorization']) {
    const auth = await verifyProjectAccess(req, res)
    if (!auth) return // verifyProjectAccess sent the error
    endpoint = (auth.project.braze_base_url || '').replace(/\/+$/, '')
    apiKey = auth.project.braze_api_key || ''
  } else {
    // .env fallback (기존 단일 고객사 모드)
    endpoint = (process.env.BRAZE_REST_ENDPOINT || '').replace(/\/+$/, '')
    apiKey = process.env.BRAZE_API_KEY || ''
  }

  if (!endpoint || !apiKey) {
    res.status(500).json({
      message: 'Braze configuration not found. Check project settings or BRAZE_REST_ENDPOINT/BRAZE_API_KEY env vars.',
    })
    return
  }

  const incomingUrl = new URL(req.url || '', 'http://localhost')
  const brazeUrl = new URL(brazePath, `${endpoint}/`)
  incomingUrl.searchParams.forEach((value, key) => {
    brazeUrl.searchParams.append(key, value)
  })

  try {
    const brazeResponse = await fetch(brazeUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=180')

    if (!brazeResponse.ok) {
      const body = await readBrazeError(brazeResponse)
      res.status(brazeResponse.status).json({
        message: body || `Braze request failed with ${brazeResponse.status}`,
        permission,
      })
      return
    }

    const data = await brazeResponse.json()
    res.status(200).json(data)
  } catch (error) {
    res.status(502).json({
      message: error instanceof Error ? error.message : 'Braze proxy request failed',
      permission,
    })
  }
}
