import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

async function getOpenLibraryDescription(title: string, author: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(`${title} ${author}`)
    const searchRes = await fetch(`https://openlibrary.org/search.json?q=${q}&limit=1&fields=key`)
    if (!searchRes.ok) return null
    const searchData = (await searchRes.json()) as { docs?: { key?: string }[] }
    const workKey = searchData.docs?.[0]?.key
    if (!workKey) return null

    const workRes = await fetch(`https://openlibrary.org${workKey}.json`)
    if (!workRes.ok) return null
    const workData = (await workRes.json()) as { description?: string | { value?: string } }
    const desc = typeof workData.description === 'string'
      ? workData.description
      : workData.description?.value || null
    return desc || null
  } catch {
    return null
  }
}

async function summarize(title: string, author: string, description: string | null, apiKey: string): Promise<string> {
  const context = description
    ? `Here is a description of the book:\n${description}`
    : `No description available.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `You're writing a pitch for a book club voting bracket. Write exactly 3 sentences about "${title}" by ${author}.

Sentence 1-2: Summarize what the book is about. Plain, factual, lowercase. No hype.
Sentence 3: A short casual hook — why someone should actually read this. Write it like a chill friend texting: lowercase, no punctuation formality, maybe a fragment. Examples of the vibe: "lowkey one of the best paced books ive read in a minute." or "if you liked severance this is that energy but funnier." or "trust me on this one." Keep it natural, not salesy.

${context}`,
      }],
    }),
  })

  if (!res.ok) return `${title} by ${author}.`

  const data = (await res.json()) as { content?: { text?: string }[] }
  return data.content?.[0]?.text?.trim() || `${title} by ${author}.`
}

function apiDevPlugin(): Plugin {
  let env: Record<string, string>

  return {
    name: 'api-dev',
    configResolved(config) {
      env = loadEnv(config.mode, process.cwd(), '')
    },
    configureServer(server) {
      server.middlewares.use('/api/auth', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }
        let body = ''
        for await (const chunk of req) body += chunk
        const { password } = JSON.parse(body || '{}')

        if (password === env.ORGANIZER_PASSWORD) {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ role: 'organizer' }))
        } else if (password === env.MEMBER_PASSWORD) {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ role: 'member' }))
        } else {
          res.statusCode = 401
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Invalid password' }))
        }
      })

      server.middlewares.use('/api/generate-pitch', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }
        let pitchBody = ''
        for await (const chunk of req) pitchBody += chunk
        const { title, authors, description } = JSON.parse(pitchBody || '{}')

        const author = authors?.[0] || 'someone mysterious'

        const olDesc = await getOpenLibraryDescription(title, author)
        const pitch = await summarize(title, author, olDesc || description, env.ANTHROPIC_API_KEY || '')
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ pitch }))
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiDevPlugin()],
})
