import { rejected, forward } from '../../server/lib/bff.js'

// GET /api/auth/logged -> GET {upstream}/auth/logged
// The user token comes in the `access-token` header or as `Authorization: Bearer <token>`
// (same as api/models.js); it is always forwarded upstream as `access-token`
export default async function handler(req, res) {
  // if (rejected(req, res, 'GET')) return
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : req.headers['access-token']
  if (!token) return res.status(401).json({ message: 'Not authenticated' })
  return forward(req, res, '/auth/logged', { method: 'GET', headers: { 'access-token': token } })
}
