export default function handler(req, res) {
  const secret = req.headers['x-internal-secret']

  if (!secret || secret !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const now = new Date()

  res.status(200).json({
    date: now.toISOString().split('T')[0],
    time: now.toTimeString().split(' ')[0],
    timestamp: now.toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
}
