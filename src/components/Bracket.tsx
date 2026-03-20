import type { Matchup as MatchupType, Book, Session, Member } from '../lib/types'
import { Matchup } from './Matchup'

interface Props {
  matchups: MatchupType[]
  books: Book[]
  session: Session
  members: Member[]
  myVotes: Record<string, string>
  voteCounts: Record<string, Record<string, number>>
  allVotedMatchups: Set<string>
  onVote: (matchupId: string, bookId: string) => void
  onTiebreaker: (matchupId: string) => void
  onAdvance: (matchup: MatchupType, winnerId: string) => void
  currentRound: number
}

export function Bracket({
  matchups, books, session, members, myVotes, voteCounts,
  allVotedMatchups, onVote, onTiebreaker, onAdvance, currentRound,
}: Props) {
  const bookMap = new Map(books.map((b) => [b.id, b]))
  const totalRounds = Math.max(...matchups.map((m) => m.round), 0)

  const roundNames = (round: number, total: number) => {
    if (round === total) return 'final'
    if (round === total - 1) return 'semifinals'
    if (round === total - 2) return 'quarterfinals'
    return `round ${round}`
  }

  return (
    <div className="px-5 py-8">
      <div className="mb-10">
        <h1 className="font-serif text-3xl font-bold text-ink mb-1">book bracket</h1>
        <p className="text-ink-muted">
          {totalRounds > 0 ? roundNames(currentRound, totalRounds) : 'bracket'}
        </p>
      </div>

      {/* Scrollable bracket */}
      <div className="overflow-x-auto -mx-5 px-5">
        <div className="flex gap-8 min-w-max pb-4">
          {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => {
            const roundMatchups = matchups
              .filter((m) => m.round === round)
              .sort((a, b) => a.position - b.position)

            return (
              <div key={round} className="flex flex-col min-w-[300px]">
                <h3 className={`text-xs tracking-wide mb-4 ${
                  round === currentRound
                    ? 'text-accent font-medium'
                    : 'text-ink-muted'
                }`}>
                  {roundNames(round, totalRounds)}
                </h3>

                <div className="flex flex-col justify-around flex-1 divide-y divide-divider">
                  {roundMatchups.map((matchup) => (
                    <Matchup
                      key={matchup.id}
                      matchup={matchup}
                      bookA={matchup.book_a ? bookMap.get(matchup.book_a) || null : null}
                      bookB={matchup.book_b ? bookMap.get(matchup.book_b) || null : null}
                      myVote={myVotes[matchup.id] || null}
                      voteCounts={voteCounts[matchup.id] || {}}
                      allVoted={allVotedMatchups.has(matchup.id)}
                      memberCount={members.length}
                      onVote={(bookId) => onVote(matchup.id, bookId)}
                      onTiebreaker={() => onTiebreaker(matchup.id)}
                      onAdvance={(winnerId) => onAdvance(matchup, winnerId)}
                      isOrganizer={session.role === 'organizer'}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
