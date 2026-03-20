import type { Book, Matchup as MatchupType } from '../lib/types'

interface Props {
  matchup: MatchupType
  bookA: Book | null
  bookB: Book | null
  myVote: string | null
  voteCounts: Record<string, number>
  allVoted: boolean
  memberCount: number
  onVote: (bookId: string) => void
  onTiebreaker?: () => void
  onAdvance?: (winnerId: string) => void
  isOrganizer: boolean
}

export function Matchup({
  matchup, bookA, bookB, myVote, voteCounts, allVoted,
  memberCount, onVote, onTiebreaker, onAdvance, isOrganizer,
}: Props) {
  const isVoting = matchup.status === 'voting'
  const isTiebreaker = matchup.status === 'tiebreaker'
  const isComplete = matchup.status === 'complete'
  const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0)

  const countA = bookA ? voteCounts[bookA.id] || 0 : 0
  const countB = bookB ? voteCounts[bookB.id] || 0 : 0
  const isTied = allVoted && countA === countB && countA > 0

  const renderBookSide = (book: Book | null) => {
    if (!book) {
      return (
        <div className="flex-1 py-3 flex items-center justify-center min-h-[60px]">
          <span className="text-ink-muted text-sm italic">tbd</span>
        </div>
      )
    }

    const isWinner = matchup.winner === book.id
    const isMyVote = myVote === book.id
    const voteCount = voteCounts[book.id] || 0

    return (
      <button
        onClick={() => isVoting && !myVote && onVote(book.id)}
        disabled={!isVoting || !!myVote}
        className={`flex-1 py-3 px-2 text-left transition-colors duration-150 ${
          isVoting && !myVote
            ? 'hover:bg-cream-dark cursor-pointer'
            : ''
        } ${isWinner ? 'bg-cream-dark' : ''}`}
      >
        <div className="flex items-center gap-3">
          {book.cover_url ? (
            <img src={book.cover_url} alt="" className="w-8 h-11 object-cover flex-shrink-0" />
          ) : (
            <div className="w-8 h-11 bg-cream-dark flex-shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className={`font-serif text-sm truncate ${isWinner ? 'text-accent' : 'text-ink'}`}>
              {book.seed && <span className="text-ink-muted mr-1 font-sans text-xs">#{book.seed}</span>}
              {book.title}
            </p>
            <p className="text-xs text-ink-light truncate">{book.authors.join(', ')}</p>
          </div>
        </div>
        {(allVoted || isComplete) && (
          <div className="mt-2 flex items-center gap-2 ml-11">
            <div className="flex-1 bg-divider h-1 overflow-hidden">
              <div
                className={`h-full ${isWinner ? 'bg-accent' : 'bg-ink-muted'}`}
                style={{ width: totalVotes ? `${(voteCount / totalVotes) * 100}%` : '0%' }}
              />
            </div>
            <span className="text-xs text-ink-muted">{voteCount}</span>
          </div>
        )}
        {isMyVote && !allVoted && (
          <p className="text-xs text-accent mt-1 ml-11">your vote</p>
        )}
      </button>
    )
  }

  return (
    <div className={`py-3 ${isComplete ? 'opacity-60' : ''}`}>
      {/* Status */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs ${
          isVoting ? 'text-accent' :
          isTiebreaker ? 'text-error' :
          'text-ink-muted'
        }`}>
          {isComplete ? 'complete' : isVoting ? `voting (${totalVotes}/${memberCount})` : isTiebreaker ? 'tiebreaker' : 'pending'}
        </span>
      </div>

      <div className="flex gap-1 items-stretch">
        {renderBookSide(bookA)}
        <div className="flex items-center text-ink-muted text-xs px-1">vs</div>
        {renderBookSide(bookB)}
      </div>

      {/* Tie / organizer actions */}
      {isTied && !isComplete && isOrganizer && (
        <div className="mt-3 flex gap-3">
          {onTiebreaker && (
            <button
              onClick={onTiebreaker}
              className="text-xs text-accent hover:text-accent-hover transition-colors duration-150"
            >
              open tiebreaker
            </button>
          )}
          {bookA?.page_count && bookB?.page_count && bookA.page_count !== bookB.page_count && onAdvance && (
            <button
              onClick={() => {
                const winner = bookA.page_count! < bookB.page_count! ? bookA : bookB
                onAdvance(winner.id)
              }}
              className="text-xs text-ink-muted hover:text-ink-light transition-colors duration-150"
            >
              fewer pages wins
            </button>
          )}
        </div>
      )}

      {/* Organizer manual advance for tiebreaker */}
      {isTiebreaker && isOrganizer && bookA && bookB && onAdvance && (
        <div className="mt-3 flex gap-3">
          <button
            onClick={() => onAdvance(bookA.id)}
            className="text-xs text-accent hover:text-accent-hover transition-colors duration-150"
          >
            advance "{bookA.title}"
          </button>
          <button
            onClick={() => onAdvance(bookB.id)}
            className="text-xs text-accent hover:text-accent-hover transition-colors duration-150"
          >
            advance "{bookB.title}"
          </button>
        </div>
      )}
    </div>
  )
}
