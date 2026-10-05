import { rejected, forward } from '../../server/lib/bff.js'

// POST /api/auth/forgot -> POST {upstream}/auth/forgot
export default async function handler(req, res) {
  // if (rejected(req, res, 'POST')) return
  const { email } = req.body || {}
  if (!email) return res.status(400).json({ message: 'Email is required' })
  return forward(req, res, '/auth/forgot', { body: { email } })
}
