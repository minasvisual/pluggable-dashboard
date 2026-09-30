import { rejected, forward } from '../lib/bff.js'

// POST /api/auth/login -> POST {upstream}/auth/login
export default async function handler(req, res) {
  if (rejected(req, res, 'POST')) return
  const { email, password, remember } = req.body || {}
  if (!email || !password) {
    return res.status(403).json({ message: 'Missing email or password' })
  }
  return forward(req, res, '/auth/login', { body: { email, password, remember } })
}
