import { useState, useEffect, useCallback } from 'react'
import type { Vote } from '../lib/types'
import { supabase } from '../lib/supabase'

export function useVoting(clubId: string | null) {
  const [votes, setVotes] = useState<Vote[]>([])

  const fetchVotes = useCallback(async () => {
    if (!clubId) return
    // Get all votes for matchups in this club
    const { data } = await supabase
      .from('votes')
      .select('*, matchups!inner(club_id)')
      .eq('matchups.club_id', clubId)
    if (data) setVotes(data.map(({ matchups: _, ...v }) => v))
  }, [clubId])

  useEffect(() => { fetchVotes() }, [fetchVotes])

  // Realtime
  useEffect(() => {
    if (!clubId) return

    const channel = supabase
      .channel('votes-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes' },
        () => { fetchVotes() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [clubId, fetchVotes])

  const castVote = useCallback(async (matchupId: string, memberId: string, bookId: string) => {
    const { error } = await supabase
      .from('votes')
      .upsert(
        { matchup_id: matchupId, member_id: memberId, book_id: bookId },
        { onConflict: 'matchup_id,member_id' }
      )
    if (error) throw error
  }, [])

  const getMatchupVotes = useCallback((matchupId: string) => {
    return votes.filter((v) => v.matchup_id === matchupId)
  }, [votes])

  const getMemberVote = useCallback((matchupId: string, memberId: string) => {
    return votes.find((v) => v.matchup_id === matchupId && v.member_id === memberId)
  }, [votes])

  const getVoteCounts = useCallback((matchupId: string) => {
    const matchVotes = votes.filter((v) => v.matchup_id === matchupId)
    const counts: Record<string, number> = {}
    for (const v of matchVotes) {
      counts[v.book_id] = (counts[v.book_id] || 0) + 1
    }
    return counts
  }, [votes])

  return { votes, castVote, getMatchupVotes, getMemberVote, getVoteCounts }
}
