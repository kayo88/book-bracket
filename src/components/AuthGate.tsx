import { useState } from 'react'
import type { Role } from '../lib/types'

interface Props {
  onAuthenticated: (role: Role, displayName: string) => void
  loading: boolean
  error: string | null
  authenticate: (password: string) => Promise<Role | null>
}

export function AuthGate({ onAuthenticated, loading, error, authenticate }: Props) {
  const [step, setStep] = useState<'password' | 'name'>('password')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role | null>(null)

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await authenticate(password)
    if (result) {
      setRole(result)
      setStep('name')
    }
  }

  const handleName = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim() && role) {
      onAuthenticated(role, name.trim())
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-3xl font-bold text-ink mb-1">
          book bracket
        </h1>
        <div className="mb-12" />

        {step === 'password' ? (
          <form onSubmit={handlePassword}>
            <label className="block text-sm text-ink-light mb-2">
              club password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border-b border-divider px-0 py-3 text-ink placeholder-ink-muted focus:outline-none focus:border-accent transition-colors duration-150 mb-6"
              placeholder="enter password"
              autoFocus
            />
            {error && <p className="text-error text-sm mb-4">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-accent hover:bg-accent-hover disabled:opacity-40 text-cream font-medium py-3 transition-colors duration-150"
            >
              {loading ? 'checking...' : 'enter'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleName}>
            <label className="block text-sm text-ink-light mb-2">
              what should we call you?
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent border-b border-divider px-0 py-3 text-ink placeholder-ink-muted focus:outline-none focus:border-accent transition-colors duration-150 mb-2"
              placeholder="your name"
              autoFocus
              maxLength={20}
            />
            <p className="text-ink-muted text-xs mb-6">
              joining as {role === 'organizer' ? 'organizer' : 'member'}
            </p>
            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full bg-accent hover:bg-accent-hover disabled:opacity-40 text-cream font-medium py-3 transition-colors duration-150"
            >
              join club
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
