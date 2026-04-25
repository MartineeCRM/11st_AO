function getBrazeConfig() {
  const endpoint = (process.env.BRAZE_REST_ENDPOINT || '').replace(/\/+$/, '')
  const apiKey = process.env.BRAZE_API_KEY || ''
  return { endpoint, apiKey }
}

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

  const { endpoint, apiKey } = getBrazeConfig()
  if (!endpoint || !apiKey) {
    res.status(500).json({
      message: 'Braze server environment variables are not configured. Required: BRAZE_REST_ENDPOINT, BRAZE_API_KEY',
    })
    return
  }

  const incomingUrl = new URL(req.url || '', 'http://localhost')
  const brazeUrl = new URL(brazePath, `${endpoint}/`)
  incomingUrl.searchParams.forEach((value, key) => {
    brazeUrl.searchParams.append(key, value)
  })

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
}
