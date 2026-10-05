const UPSTREAM = (process.env.SSO_URL || 'https://server.mantovaniarts.com').replace(/\/$/, '')

// Returns true when the request was rejected (response already sent)
export function rejected(req, res, method) {
  if (req.method !== method) {
    res.setHeader('Allow', method)
    res.status(405).json({ error: 'Method Not Allowed' })
    return true
  }
  const secret = req.headers['x-internal-secret']
  if (!secret || secret !== process.env.API_SECRET) {
    res.status(401).json({ error: 'Unauthorized' })
    return true
  }
  return false
}

// Forwards the call to the upstream API and relays status + body untouched
export async function forward(req, res, path, { method = 'POST', body, headers = {} } = {}) {
  try {
    const appKey = req.headers['app-key'] || process.env.SSO_APP_KEY
    const upstream = await fetch(`${UPSTREAM}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(appKey ? { 'app-key': appKey } : {}),
        ...headers,
      },
      body: method === 'GET' ? undefined : JSON.stringify(body || {}),
    })
    const text = await upstream.text()
    let data
    try { data = text ? JSON.parse(text) : {} } catch (e) { data = { message: text } }
    res.status(upstream.status).json(data)
  } catch (error) {
    res.status(502).json({ error: 'Upstream unavailable', detail: error.message })
  }
}
