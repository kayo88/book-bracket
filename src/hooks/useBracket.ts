import { useState, useEffect, useCallback } from 'react'
import type { Matchup, Book } from '../lib/types'
import { supabase } from '../lib/supabase'
import { generateBracket, getNextMatchup } from '../lib/bracket'

export function useBracket(clubId: string | null) {
  const [matchups, setMatchups] = useState<Matchup[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMatchups = useCallback(async () => {
    if (!clubId) return
    const { data } = await supabase
      .from('matchups')
      .select('*')
      .eq('club_id', clubId)
      .order('round')
      .order('position')
    if (data) setMatchups(data)
    setLoading(false)
  }, [clubId])

  useEffect(() => { fetchMatchups() }, [fetchMatchups])

  // Realtime
  useEffect(() => {
    if (!clubId) return

    const channel = supabase
      .channel('matchups-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matchups', filter: `club_id=eq.${clubId}` },
        () => { fetchMatchups() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [clubId, fetchMatchups])

  const generate = useCallback(async (books: Book[]) => {
    if (!clubId) return

    // Guard against double generation
    const { count } = await supabase
      .from('matchups')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', clubId)
    if (count && count > 0) return

    const { matchups: generated, seededBooks } = generateBracket(books)

    // Update seeds on books
    for (const sb of seededBooks) {
      await supabase.from('books').update({ seed: sb.seed }).eq('id', sb.id)
    }

    // Insert all matchups
    const rows = generated.map((m) => ({
      club_id: clubId,
      round: m.round,
      position: m.position,
      book_a: m.book_a,
      book_b: m.book_b,
      status: m.round === 1 && m.book_a && m.book_b ? 'voting' : m.round === 1 && (m.book_a || m.book_b) ? 'complete' : 'pending',
      // If it's a bye (only one book), auto-advance that book as winner
      winner: m.round === 1 && m.book_a && !m.book_b ? m.book_a : m.round === 1 && !m.book_a && m.book_b ? m.book_b : null,
    }))

    await supabase.from('matchups').insert(rows)

    // Handle bye auto-advancement: advance winners to next round
    const byeMatchups = rows.filter((r) => r.winner)
    for (const bye of byeMatchups) {
      const next = getNextMatchup(bye.round, bye.position)
      // Find the matchup in the next round at that position
      const { data: nextMatchups } = await supabase
        .from('matchups')
        .select('*')
        .eq('club_id', clubId)
        .eq('round', next.round)
        .eq('position', next.position)

      if (nextMatchups?.[0]) {
        const field = next.slot === 'a' ? 'book_a' : 'book_b'
        await supabase
          .from('matchups')
          .update({ [field]: bye.winner })
          .eq('id', nextMatchups[0].id)
      }
    }

    // Transition club to bracket phase
    await supabase.from('clubs').update({ phase: 'bracket', current_round: 1 }).eq('id', clubId)
  }, [clubId])

  const advanceWinner = useCallback(async (matchup: Matchup, winnerId: string) => {
    // Mark matchup complete
    await supabase
      .from('matchups')
      .update({ winner: winnerId, status: 'complete' })
      .eq('id', matchup.id)

    // Get total rounds
    const maxRound = Math.max(...matchups.map((m) => m.round))

    // If this was the final round, mark club as complete
    if (matchup.round === maxRound) {
      await supabase.from('clubs').update({ phase: 'complete' }).eq('id', matchup.club_id)
      return
    }

    // Advance winner to next matchup
    const next = getNextMatchup(matchup.round, matchup.position)
    const { data: nextMatchups } = await supabase
      .from('matchups')
      .select('*')
      .eq('club_id', clubId)
      .eq('round', next.round)
      .eq('position', next.position)

    if (nextMatchups?.[0]) {
      const field = next.slot === 'a' ? 'book_a' : 'book_b'
      const update: any = { [field]: winnerId }

      // Check if both books are now set — if so, open voting
      const existing = nextMatchups[0]
      const otherField = next.slot === 'a' ? 'book_b' : 'book_a'
      if (existing[otherField]) {
        update.status = 'voting'
      }

      await supabase.from('matchups').update(update).eq('id', existing.id)

      // Update current_round on club if we're advancing
      const roundMatchups = matchups.filter((m) => m.round === matchup.round)
      const allComplete = roundMatchups.every(
        (m) => m.id === matchup.id || m.status === 'complete'
      )
      if (allComplete) {
        await supabase
          .from('clubs')
          .update({ current_round: matchup.round + 1 })
          .eq('id', clubId)
      }
    }
  }, [clubId, matchups])

  return { matchups, loading, generate, advanceWinner, refetch: fetchMatchups }
}
