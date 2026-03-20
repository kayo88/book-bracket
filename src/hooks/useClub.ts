import { useState, useEffect, useCallback } from 'react'
import type { Club, Member } from '../lib/types'
import { supabase } from '../lib/supabase'

export function useClub(clubId: string | null) {
  const [club, setClub] = useState<Club | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch club + members
  useEffect(() => {
    if (!clubId) return

    async function fetch() {
      const [clubRes, membersRes] = await Promise.all([
        supabase.from('clubs').select('*').eq('id', clubId).single(),
        supabase.from('members').select('*').eq('club_id', clubId),
      ])
      if (clubRes.data) setClub(clubRes.data)
      if (membersRes.data) setMembers(membersRes.data)
      setLoading(false)
    }

    fetch()
  }, [clubId])

  // Realtime subscription for club changes
  useEffect(() => {
    if (!clubId) return

    const channel = supabase
      .channel('club-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clubs', filter: `id=eq.${clubId}` },
        (payload) => {
          if (payload.new) setClub(payload.new as Club)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'members', filter: `club_id=eq.${clubId}` },
        () => {
          // Refetch members on any change
          supabase.from('members').select('*').eq('club_id', clubId).then(({ data }) => {
            if (data) setMembers(data)
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [clubId])

  const updatePhase = useCallback(async (phase: Club['phase'], currentRound?: number) => {
    if (!clubId) return
    const update: any = { phase }
    if (currentRound !== undefined) update.current_round = currentRound
    await supabase.from('clubs').update(update).eq('id', clubId)
  }, [clubId])

  return { club, members, loading, updatePhase }
}
