import { useState, useCallback } from 'react'
import type { Session, Role } from '../lib/types'
import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'book-bracket-session'

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveSession(session: Session | null) {
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(loadSession)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const authenticate = useCallback(async (password: string): Promise<Role | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        setError('Invalid password')
        return null
      }
      const { role } = await res.json()
      return role as Role
    } catch {
      setError('Connection error')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (displayName: string, role: Role, clubId: string) => {
    setLoading(true)
    setError(null)
    try {
      // Check if a member with this name already exists — rejoin if so
      const { data: existing } = await supabase
        .from('members')
        .select('*')
        .eq('club_id', clubId)
        .ilike('display_name', displayName)
        .single()

      if (existing) {
        const restored: Session = {
          memberId: existing.id,
          displayName: existing.display_name,
          role: existing.role,
          clubId,
        }
        saveSession(restored)
        setSession(restored)
        return restored
      }

      const { data, error: dbError } = await supabase
        .from('members')
        .insert({ display_name: displayName, role, club_id: clubId })
        .select()
        .single()

      if (dbError) throw dbError

      const newSession: Session = {
        memberId: data.id,
        displayName: data.display_name,
        role: data.role,
        clubId,
      }
      saveSession(newSession)
      setSession(newSession)
      return newSession
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    saveSession(null)
    setSession(null)
  }, [])

  return { session, loading, error, authenticate, register, logout }
}
