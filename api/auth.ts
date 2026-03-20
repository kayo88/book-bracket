import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { password } = req.body || {}
  if (!password) {
    return res.status(400).json({ error: 'Password required' })
  }

  const memberPw = process.env.MEMBER_PASSWORD
  const organizerPw = process.env.ORGANIZER_PASSWORD

  if (password === organizerPw) {
    return res.status(200).json({ role: 'organizer' })
  }
  if (password === memberPw) {
    return res.status(200).json({ role: 'member' })
  }

  return res.status(401).json({ error: 'Invalid password' })
}
