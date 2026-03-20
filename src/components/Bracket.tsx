import { Fragment, useState, useEffect, useMemo } from 'react'
import type { Matchup as MatchupType, Book, Session, Member } from '../lib/types'

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

const MATCHUP_H = 72
const CONNECTOR_W = 28

function Connector({ pairCount, pairHeight }: { pairCount: number; pairHeight: number }) {
  return (
    <div className="flex flex-col flex-shrink-0" style={{ width: CONNECTOR_W }}>
      {Array.from({ length: pairCount }).map((_, i) => (
        <div key={i} className="relative" style={{ height: pairHeight }}>
          <div className="absolute border-t border-ink-muted/30" style={{ top: '25%', left: 0, width: '50%' }} />
          <div className="absolute border-t border-ink-muted/30" style={{ top: '75%', left: 0, width: '50%' }} />
          <div className="absolute border-l border-ink-muted/30" style={{ left: '50%', top: '25%', height: '50%' }} />
          <div className="absolute border-t border-ink-muted/30" style={{ top: '50%', left: '50%', width: '50%' }} />
        </div>
      ))}
    </div>
  )
}

function InfoIcon({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      className="text-ink-muted/50 hover:text-accent flex-shrink-0 transition-colors"
      title="book info"
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="6.5" />
        <path d="M8 7v4M8 5.5v-.01" strokeLinecap="round" />
      </svg>
    </button>
  )
}

export function Bracket({
  matchups, books, session, members, myVotes, voteCounts,
  allVotedMatchups, onVote, onTiebreaker, onAdvance, currentRound,
}: Props) {
  const bookMap = useMemo(() => new Map(books.map((b) => [b.id, b])), [books])
  const totalRounds = Math.max(...matchups.map((m) => m.round), 0)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null)

  // Auto-select first unvoted matchup
  useEffect(() => {
    const current = matchups.find(m => m.id === selectedId)
    if (!current || current.status === 'complete') {
      const unvoted = matchups.find(m => m.status === 'voting' && !myVotes[m.id])
      const firstActive = matchups.find(m => m.status === 'voting')
      setSelectedId(unvoted?.id || firstActive?.id || selectedId)
    }
  }, [matchups, myVotes, selectedId])

  const selectedMatchup = matchups.find(m => m.id === selectedId)

  const roundLabel = (round: number) => {
    if (round === totalRounds) return 'final'
    if (round === totalRounds - 1) return 'semis'
    if (round === totalRounds - 2) return 'quarters'
    return `round ${round}`
  }

  const toggleBookInfo = (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation()
    setExpandedBookId(prev => prev === bookId ? null : bookId)
  }

  return (
    <div className="py-8">
      <div className="px-5 mb-6">
        <h1 className="font-serif text-3xl font-bold text-ink mb-1">book bracket</h1>
        <p className="text-ink-muted text-sm">
          {roundLabel(currentRound)} · tap a matchup, then vote below
        </p>
      </div>

      {/* Bracket */}
      <div className="overflow-x-auto px-5 pb-4">
        <div className="flex">
          {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => {
            const roundMatchups = matchups
              .filter((m) => m.round === round)
              .sort((a, b) => a.position - b.position)

            const wrapperH = MATCHUP_H * Math.pow(2, round - 1)

            return (
              <Fragment key={round}>
                <div className="flex flex-col flex-shrink-0">
                  {roundMatchups.map((matchup) => {
                    const bookA = matchup.book_a ? bookMap.get(matchup.book_a) ?? null : null
                    const bookB = matchup.book_b ? bookMap.get(matchup.book_b) ?? null : null
                    const isSelected = matchup.id === selectedId
                    const isVoting = matchup.status === 'voting'
                    const isComplete = matchup.status === 'complete'
                    const myVote = myVotes[matchup.id] || null

                    const slotStyle = (book: Book | null) => {
                      if (!book) return 'text-ink-muted'
                      if (matchup.winner === book.id) return 'text-accent font-medium bg-accent/5'
                      if (matchup.winner && matchup.winner !== book.id) return 'text-ink-muted line-through opacity-50'
                      if (myVote === book.id) return 'text-ink bg-accent/5'
                      return 'text-ink'
                    }

                    return (
                      <div
                        key={matchup.id}
                        className="flex items-center"
                        style={{ height: wrapperH }}
                      >
                        <button
                          onClick={() => setSelectedId(matchup.id)}
                          className={`w-56 border text-left transition-all ${
                            isSelected
                              ? 'border-accent shadow-sm'
                              : isVoting
                              ? 'border-accent/30 hover:border-accent/60'
                              : 'border-divider'
                          } ${isComplete && !isSelected ? 'opacity-60' : ''}`}
                        >
                          <div className={`h-9 flex items-center gap-1.5 px-2.5 text-xs transition-colors ${slotStyle(bookA)}`}>
                            <span className="text-ink-muted/60 w-3 text-right text-[10px] flex-shrink-0">{bookA?.seed ?? ''}</span>
                            <span className="truncate flex-1">{bookA?.title ?? 'tbd'}</span>
                            {bookA && <InfoIcon onClick={(e) => toggleBookInfo(e, bookA.id)} />}
                            {myVote === bookA?.id && !matchup.winner && <span className="text-accent text-[8px] flex-shrink-0">●</span>}
                          </div>
                          <div className="border-t border-divider/50" />
                          <div className={`h-9 flex items-center gap-1.5 px-2.5 text-xs transition-colors ${slotStyle(bookB)}`}>
                            <span className="text-ink-muted/60 w-3 text-right text-[10px] flex-shrink-0">{bookB?.seed ?? ''}</span>
                            <span className="truncate flex-1">{bookB?.title ?? 'tbd'}</span>
                            {bookB && <InfoIcon onClick={(e) => toggleBookInfo(e, bookB.id)} />}
                            {myVote === bookB?.id && !matchup.winner && <span className="text-accent text-[8px] flex-shrink-0">●</span>}
                          </div>
                        </button>
                      </div>
                    )
                  })}
                </div>

                {round < totalRounds && (
                  <Connector
                    pairCount={roundMatchups.length / 2}
                    pairHeight={wrapperH * 2}
                  />
                )}
              </Fragment>
            )
          })}
        </div>
      </div>

      {/* Expanded book info popover */}
      {expandedBookId && (() => {
        const book = bookMap.get(expandedBookId)
        if (!book) return null
        return (
          <div className="max-w-md mx-auto px-5 mt-2 mb-4">
            <div className="border border-divider p-4 bg-cream-dark/30">
              <div className="flex items-start gap-3 mb-2">
                {book.cover_url && (
                  <img src={book.cover_url} alt="" className="w-10 h-14 object-cover flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-serif text-sm text-ink leading-tight">{book.title}</h4>
                      <p className="text-xs text-ink-light mt-0.5">{book.authors.join(', ')}</p>
                    </div>
                    <button
                      onClick={() => setExpandedBookId(null)}
                      className="text-ink-muted hover:text-ink text-xs ml-2 flex-shrink-0"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
              {book.pitch && (
                <p className="text-xs text-ink-muted italic leading-relaxed mt-2">"{book.pitch}"</p>
              )}
              {book.page_count && (
                <p className="text-[10px] text-ink-muted mt-1">{book.page_count} pages</p>
              )}
            </div>
          </div>
        )
      })()}

      {/* Detail panel */}
      {selectedMatchup && (() => {
        const bookA = selectedMatchup.book_a ? bookMap.get(selectedMatchup.book_a) ?? null : null
        const bookB = selectedMatchup.book_b ? bookMap.get(selectedMatchup.book_b) ?? null : null
        const isVoting = selectedMatchup.status === 'voting'
        const isTiebreaker = selectedMatchup.status === 'tiebreaker'
        const myVote = myVotes[selectedMatchup.id] || null
        const counts = voteCounts[selectedMatchup.id] || {}
        const totalVotes = Object.values(counts).reduce((a, b) => a + b, 0)
        const isTied = allVotedMatchups.has(selectedMatchup.id) && bookA && bookB
          && (counts[bookA.id] || 0) === (counts[bookB.id] || 0) && totalVotes > 0

        return (
          <div className="max-w-lg mx-auto px-5 mt-6 border-t border-divider pt-6">
            <div className="flex items-center justify-between mb-4">
              <span className={`text-xs ${isVoting ? 'text-accent' : isTiebreaker ? 'text-error' : 'text-ink-muted'}`}>
                {selectedMatchup.status === 'complete'
                  ? 'complete'
                  : isTiebreaker
                  ? 'tiebreaker'
                  : isVoting
                  ? `${totalVotes} of ${members.length} voted`
                  : 'pending'}
              </span>
              {myVote && !selectedMatchup.winner && (
                <span className="text-xs text-accent">you voted</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6">
              {[bookA, bookB].filter(Boolean).map((book) => {
                if (!book) return null
                const isWinner = selectedMatchup.winner === book.id
                const isLoser = selectedMatchup.winner && selectedMatchup.winner !== book.id
                const isMyVote = myVote === book.id
                const canVote = isVoting && !myVote

                return (
                  <div key={book.id} className={isLoser ? 'opacity-40' : ''}>
                    <div className="flex items-start gap-3 mb-2">
                      {book.cover_url && (
                        <img src={book.cover_url} alt="" className="w-10 h-14 object-cover flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-ink-muted text-[10px] mb-0.5">#{book.seed}</p>
                        <h4 className={`font-serif text-sm leading-tight ${isWinner ? 'text-accent' : 'text-ink'}`}>
                          {book.title}
                        </h4>
                        <p className="text-xs text-ink-light mt-0.5">{book.authors.join(', ')}</p>
                      </div>
                    </div>

                    {book.pitch && (
                      <p className="text-xs text-ink-muted italic leading-relaxed mb-3">"{book.pitch}"</p>
                    )}

                    {canVote && (
                      <button
                        onClick={() => onVote(selectedMatchup.id, book.id)}
                        className="text-xs bg-accent hover:bg-accent-hover text-cream px-4 py-1.5 transition-colors"
                      >
                        vote for this
                      </button>
                    )}
                    {isMyVote && !selectedMatchup.winner && (
                      <p className="text-xs text-accent">your vote ●</p>
                    )}
                    {selectedMatchup.winner && (
                      <p className={`text-xs ${isWinner ? 'text-accent font-medium' : 'text-ink-muted'}`}>
                        {counts[book.id] || 0} vote{(counts[book.id] || 0) !== 1 ? 's' : ''}{isWinner ? ' · winner' : ''}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Organizer: tiebreaker controls */}
            {session.role === 'organizer' && isTied && !selectedMatchup.winner && selectedMatchup.status !== 'tiebreaker' && (
              <div className="mt-4 pt-4 border-t border-divider">
                <button
                  onClick={() => onTiebreaker(selectedMatchup.id)}
                  className="text-xs text-error hover:opacity-70"
                >
                  tied — open tiebreaker
                </button>
              </div>
            )}
            {session.role === 'organizer' && isTiebreaker && bookA && bookB && (
              <div className="mt-4 pt-4 border-t border-divider flex gap-4">
                <button
                  onClick={() => onAdvance(selectedMatchup, bookA.id)}
                  className="text-xs text-accent hover:text-accent-hover"
                >
                  advance "{bookA.title}"
                </button>
                <button
                  onClick={() => onAdvance(selectedMatchup, bookB.id)}
                  className="text-xs text-accent hover:text-accent-hover"
                >
                  advance "{bookB.title}"
                </button>
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
