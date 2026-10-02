import { rejected, forward } from '../lib/bff.js'

// GET /api/auth/logged -> GET {upstream}/auth/logged
// The user token is sent in the `access-token` header (same as the upstream API)
export default async function handler(req, res) {
  // if (rejected(req, res, 'GET')) return
  const token = req.headers['access-token']
  if (!token) return res.status(401).json({ message: 'Not authenticated' })
  return forward(req, res, '/auth/logged', { method: 'GET', headers: { 'access-token': token } })
}
