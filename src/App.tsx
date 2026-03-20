import { useState, useEffect, useCallback } from 'react'
import type { Role, Matchup as MatchupType, GoogleBookResult } from './lib/types'
import { supabase } from './lib/supabase'
import { useSession } from './hooks/useSession'
import { useClub } from './hooks/useClub'
import { useBooks } from './hooks/useBooks'
import { useBracket } from './hooks/useBracket'
import { useVoting } from './hooks/useVoting'
import { AuthGate } from './components/AuthGate'
import { Lobby } from './components/Lobby'
import { Bracket } from './components/Bracket'
import { TiebreakerThread } from './components/TiebreakerThread'
import { Results } from './components/Results'

// The single club ID — for v1, we use one club seeded in the DB
const CLUB_ID_KEY = 'book-bracket-club-id'

function App() {
  const { session, loading: authLoading, error: authError, authenticate, register, logout } = useSession()
  const [clubId, setClubId] = useState<string | null>(() => {
    return session?.clubId || localStorage.getItem(CLUB_ID_KEY)
  })
  const [tiebreakerMatchupId, setTiebreakerMatchupId] = useState<string | null>(null)

  const { club, members, loading: clubLoading } = useClub(clubId)
  const { books, submitBook, deleteBook } = useBooks(clubId)
  const { matchups, generate, advanceWinner } = useBracket(clubId)
  const { castVote, getMatchupVotes, getMemberVote, getVoteCounts } = useVoting(clubId)

  // On first load, find or create the club
  useEffect(() => {
    if (clubId) return

    async function findOrCreateClub() {
      const { data: existing } = await supabase
        .from('clubs')
        .select('id')
        .limit(1)
        .single()

      if (existing) {
        setClubId(existing.id)
        localStorage.setItem(CLUB_ID_KEY, existing.id)
      } else {
        const { data: created } = await supabase
          .from('clubs')
          .insert({ phase: 'submissions' })
          .select()
          .single()

        if (created) {
          setClubId(created.id)
          localStorage.setItem(CLUB_ID_KEY, created.id)
        }
      }
    }

    findOrCreateClub()
  }, [clubId])

  // Auth flow
  const handleAuthenticated = useCallback(async (role: Role, displayName: string) => {
    if (!clubId) return
    await register(displayName, role, clubId)
  }, [clubId, register])

  const handleAuthStep = useCallback(async (password: string) => {
    return await authenticate(password)
  }, [authenticate])

  // Book submission
  const handleSubmitBook = useCallback(async (book: GoogleBookResult, pitch: string | null) => {
    if (!session) return
    await submitBook(book, pitch, session.memberId)
  }, [session, submitBook])

  // Bracket generation
  const handleGenerateBracket = useCallback(async () => {
    await generate(books)
  }, [generate, books])

  // Voting
  const handleVote = useCallback(async (matchupId: string, bookId: string) => {
    if (!session) return
    await castVote(matchupId, session.memberId, bookId)
  }, [session, castVote])

  // Winner advancement (auto or manual)
  const handleAdvance = useCallback(async (matchup: MatchupType, winnerId: string) => {
    await advanceWinner(matchup, winnerId)
  }, [advanceWinner])

  // Open tiebreaker
  const handleOpenTiebreaker = useCallback(async (matchupId: string) => {
    await supabase.from('matchups').update({ status: 'tiebreaker' }).eq('id', matchupId)
    setTiebreakerMatchupId(matchupId)
  }, [])

  // Compute voting state for bracket
  const myVotes: Record<string, string> = {}
  const voteCountsMap: Record<string, Record<string, number>> = {}
  const allVotedMatchups = new Set<string>()

  if (session) {
    for (const matchup of matchups) {
      const mv = getMemberVote(matchup.id, session.memberId)
      if (mv) myVotes[matchup.id] = mv.book_id
      voteCountsMap[matchup.id] = getVoteCounts(matchup.id)

      const matchVotes = getMatchupVotes(matchup.id)
      if (matchVotes.length >= members.length && members.length > 0) {
        allVotedMatchups.add(matchup.id)

        // Auto-advance if there's a clear winner and matchup is still voting
        if (matchup.status === 'voting') {
          const counts = voteCountsMap[matchup.id]
          const entries = Object.entries(counts)
          if (entries.length > 0) {
            const sorted = entries.sort((a, b) => b[1] - a[1])
            if (sorted.length === 1 || sorted[0][1] > sorted[1][1]) {
              // Clear winner — advance
              handleAdvance(matchup, sorted[0][0])
            }
            // If tied, organizer must handle
          }
        }
      }
    }
  }

  // Loading state
  if (clubLoading && clubId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-ink-muted">loading...</p>
      </div>
    )
  }

  // Not authenticated
  if (!session) {
    return (
      <AuthGate
        onAuthenticated={handleAuthenticated}
        loading={authLoading}
        error={authError}
        authenticate={handleAuthStep}
      />
    )
  }

  // Phase-based rendering
  if (!club) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-ink-muted">setting up club...</p>
      </div>
    )
  }

  // Winner for results
  const finalMatchup = matchups.find(
    (m) => m.round === Math.max(...matchups.map((x) => x.round)) && m.winner
  )
  const winnerBook = finalMatchup?.winner
    ? books.find((b) => b.id === finalMatchup.winner) || null
    : null

  return (
    <>
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3">
        <span className="text-sm text-ink-light">
          {session.displayName}
          {session.role === 'organizer' && (
            <span className="ml-1 text-accent text-xs">(organizer)</span>
          )}
        </span>
        <button
          onClick={logout}
          className="text-xs text-ink-muted hover:text-ink-light transition-colors duration-150"
        >
          logout
        </button>
      </div>

      {club.phase === 'submissions' && (
        <Lobby
          session={session}
          books={books}
          totalBookCount={books.length}
          submissionDeadline={club.submission_deadline}
          onSubmitBook={handleSubmitBook}
          onDeleteBook={deleteBook}
          onGenerateBracket={handleGenerateBracket}
        />
      )}

      {club.phase === 'bracket' && (
        <Bracket
          matchups={matchups}
          books={books}
          session={session}
          members={members}
          myVotes={myVotes}
          voteCounts={voteCountsMap}
          allVotedMatchups={allVotedMatchups}
          onVote={handleVote}
          onTiebreaker={handleOpenTiebreaker}
          onAdvance={handleAdvance}
          currentRound={club.current_round}
        />
      )}

      {club.phase === 'complete' && (
        <Results winner={winnerBook} books={books} />
      )}

      {/* Tiebreaker modal */}
      {tiebreakerMatchupId && session && (
        <TiebreakerThread
          matchupId={tiebreakerMatchupId}
          memberId={session.memberId}
          members={members}
          onClose={() => setTiebreakerMatchupId(null)}
        />
      )}
    </>
  )
}

export default App
