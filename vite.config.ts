import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

async function summarize(title: string, author: string, description: string | null, apiKey: string): Promise<string> {
  const context = description ? `Description: ${description}` : ''

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
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
        const pitch = await summarize(title, author, description, env.ANTHROPIC_API_KEY || '')
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ pitch }))
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiDevPlugin()],
})
