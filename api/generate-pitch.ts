import type { VercelRequest, VercelResponse } from '@vercel/node'

async function summarize(title: string, author: string, description: string | null): Promise<string> {
  const context = description ? `Description: ${description}` : ''

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `"${title}" by ${author}. ${context}

Write a 3-sentence book pitch. Sentences 1-2: what it's about, plain and lowercase. Sentence 3: casual hook like a friend texting, lowercase, no hype. Keep the whole thing under 40 words.`,
      }],
    }),
  })

  if (!res.ok) return `${title} by ${author}.`

  const data = await res.json()
  return data.content?.[0]?.text?.trim() || `${title} by ${author}.`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { title, authors, description } = req.body || {}
  if (!title) {
    return res.status(400).json({ error: 'Title required' })
  }

  const author = authors?.[0] || 'someone mysterious'
  const pitch = await summarize(title, author, description)

  return res.status(200).json({ pitch })
}
