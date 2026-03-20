import { Fragment, useState, useMemo } from 'react'
import type { Matchup as MatchupType, Book, Session, Member, Vote } from '../lib/types'

interface Props {
  matchups: MatchupType[]
  books: Book[]
  session: Session
  members: Member[]
  myVotes: Record<string, string>
  voteCounts: Record<string, Record<string, number>>
  allVotedMatchups: Set<string>
  votes: Vote[]
  onVote: (matchupId: string, bookId: string) => void
  onTiebreaker: (matchupId: string) => void
  onAdvance: (matchup: MatchupType, winnerId: string) => void
  currentRound: number
}

const MATCHUP_H = 76
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

export function Bracket({
  matchups, books, session, members, myVotes, voteCounts,
  allVotedMatchups, votes, onVote, onTiebreaker, onAdvance, currentRound,
}: Props) {
  const bookMap = useMemo(() => new Map(books.map((b) => [b.id, b])), [books])
  const totalRounds = Math.max(...matchups.map((m) => m.round), 0)

  const [expandedBookId, setExpandedBookId] = useState<string | null>(null)
  const [justVoted, setJustVoted] = useState<string | null>(null)

  const roundLabel = (round: number) => {
    if (round === totalRounds) return 'final'
    if (round === totalRounds - 1) return 'semis'
    if (round === totalRounds - 2) return 'quarters'
    return `round ${round}`
  }

  // Current round matchups that need votes (not pending/complete)
  const currentRoundMatchups = matchups.filter(m => m.round === currentRound)
  const votableMatchups = currentRoundMatchups.filter(m => m.status === 'voting')

  // Has the current user voted on all votable matchups?
  const myDone = votableMatchups.length > 0 && votableMatchups.every(m => myVotes[m.id])

  // How many members have voted on ALL votable matchups?
  const membersDoneCount = useMemo(() => {
    if (votableMatchups.length === 0) return 0
    const votingMembers = members.filter(m => m.role !== 'organizer')
    return votingMembers.filter(member => {
      return votableMatchups.every(matchup =>
        votes.some(v => v.matchup_id === matchup.id && v.member_id === member.id)
      )
    }).length
  }, [votes, votableMatchups, members])

  // Tied matchups (all voted but no clear winner)
  const tiedMatchups = currentRoundMatchups.filter(m => {
    if (m.winner || m.status !== 'voting') return false
    if (!allVotedMatchups.has(m.id)) return false
    const bookA = m.book_a ? bookMap.get(m.book_a) : null
    const bookB = m.book_b ? bookMap.get(m.book_b) : null
    if (!bookA || !bookB) return false
    const counts = voteCounts[m.id] || {}
    return (counts[bookA.id] || 0) === (counts[bookB.id] || 0)
  })

  const tiebreakerMatchups = currentRoundMatchups.filter(m => m.status === 'tiebreaker')
  const hasTies = tiedMatchups.length > 0 || tiebreakerMatchups.length > 0

  const handleVote = (matchupId: string, bookId: string) => {
    onVote(matchupId, bookId)
    setJustVoted(bookId)
    setTimeout(() => setJustVoted(null), 1200)
  }

  const toggleBookInfo = (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation()
    setExpandedBookId(prev => prev === bookId ? null : bookId)
  }

  const votingMembers = members.filter(m => m.role !== 'organizer')

  return (
    <div className="py-8">
      <div className="px-5 mb-4">
        <h1 className="font-serif text-3xl font-bold text-ink mb-1">book bracket</h1>
        <p className="text-ink-muted text-sm">
          {roundLabel(currentRound)}
        </p>
      </div>

      {/* Tie banner */}
      {hasTies && (
        <div className="px-5 mb-4">
          <div className="border border-error/30 bg-error/5 px-4 py-3">
            {[...tiedMatchups, ...tiebreakerMatchups].map(m => {
              const bookA = bookMap.get(m.book_a!)!
              const bookB = bookMap.get(m.book_b!)!
              return (
                <div key={m.id} className="mb-2 last:mb-0">
                  <p className="text-xs text-error">
                    {bookA.title} vs {bookB.title} is tied — we need a tiebreaker
                  </p>
                  {session.role === 'organizer' && (
                    <div className="flex gap-3 mt-1.5">
                      <button
                        onClick={() => onAdvance(m, bookA.id)}
                        className="text-xs text-accent hover:text-accent-hover"
                      >
                        advance "{bookA.title}"
                      </button>
                      <button
                        onClick={() => onAdvance(m, bookB.id)}
                        className="text-xs text-accent hover:text-accent-hover"
                      >
                        advance "{bookB.title}"
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* "You're done" banner */}
      {myDone && !hasTies && (
        <div className="px-5 mb-4">
          <div className="border border-accent/20 bg-accent/5 px-4 py-3">
            <p className="text-xs text-accent">
              you're all set for {roundLabel(currentRound)} — {membersDoneCount} of {votingMembers.length} have voted so far
            </p>
          </div>
        </div>
      )}

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
                    const isVoting = matchup.status === 'voting'
                    const isComplete = matchup.status === 'complete'
                    const isTiebreaker = matchup.status === 'tiebreaker'
                    const isTied = tiedMatchups.some(t => t.id === matchup.id)
                    const myVote = myVotes[matchup.id] || null
                    const canVote = isVoting && !myVote && !isTied
                    const counts = voteCounts[matchup.id] || {}
                    const totalVotes = Object.values(counts).reduce((a, b) => a + b, 0)

                    const slotClasses = (book: Book | null) => {
                      const base = 'h-[37px] flex items-center gap-1.5 px-2.5 text-xs transition-all'
                      if (!book) return `${base} text-ink-muted`
                      if (matchup.winner === book.id) return `${base} text-accent font-medium bg-accent/10`
                      if (matchup.winner && matchup.winner !== book.id) return `${base} text-ink-muted line-through opacity-40`
                      if (justVoted === book.id) return `${base} text-accent bg-accent/10`
                      if (myVote === book.id) return `${base} text-ink bg-accent/5 font-medium`
                      if (canVote) return `${base} text-ink hover:bg-accent/5 cursor-pointer`
                      return `${base} text-ink`
                    }

                    const handleSlotClick = (e: React.MouseEvent, book: Book | null) => {
                      if (!book || !canVote) return
                      e.stopPropagation()
                      handleVote(matchup.id, book.id)
                    }

                    return (
                      <div
                        key={matchup.id}
                        className="flex items-center"
                        style={{ height: wrapperH }}
                      >
                        <div
                          className={`w-56 border text-left transition-all ${
                            isTied || isTiebreaker
                              ? 'border-error/40'
                              : isVoting
                              ? 'border-accent/30'
                              : isComplete
                              ? 'border-divider opacity-70'
                              : 'border-divider/50'
                          }`}
                        >
                          {/* Slot A */}
                          <div
                            className={slotClasses(bookA)}
                            onClick={(e) => handleSlotClick(e, bookA)}
                          >
                            <span className="text-ink-muted/60 w-3 text-right text-[10px] flex-shrink-0">
                              {bookA?.seed ?? ''}
                            </span>
                            <span className="truncate flex-1">{bookA?.title ?? 'tbd'}</span>
                            {bookA && (
                              <button
                                onClick={(e) => toggleBookInfo(e, bookA.id)}
                                className="text-ink-muted/40 hover:text-accent flex-shrink-0 transition-colors p-0.5"
                                title="book info"
                              >
                                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <circle cx="8" cy="8" r="6.5" />
                                  <path d="M8 7v4M8 5.5v-.01" strokeLinecap="round" />
                                </svg>
                              </button>
                            )}
                            {myVote === bookA?.id && <span className="text-accent text-[8px] flex-shrink-0">●</span>}
                          </div>

                          <div className="border-t border-divider/50" />

                          {/* Slot B */}
                          <div
                            className={slotClasses(bookB)}
                            onClick={(e) => handleSlotClick(e, bookB)}
                          >
                            <span className="text-ink-muted/60 w-3 text-right text-[10px] flex-shrink-0">
                              {bookB?.seed ?? ''}
                            </span>
                            <span className="truncate flex-1">{bookB?.title ?? 'tbd'}</span>
                            {bookB && (
                              <button
                                onClick={(e) => toggleBookInfo(e, bookB.id)}
                                className="text-ink-muted/40 hover:text-accent flex-shrink-0 transition-colors p-0.5"
                                title="book info"
                              >
                                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <circle cx="8" cy="8" r="6.5" />
                                  <path d="M8 7v4M8 5.5v-.01" strokeLinecap="round" />
                                </svg>
                              </button>
                            )}
                            {myVote === bookB?.id && <span className="text-accent text-[8px] flex-shrink-0">●</span>}
                          </div>

                          {/* Vote progress bar */}
                          {isVoting && totalVotes > 0 && !isTied && (
                            <div className="h-[2px] bg-divider/30">
                              <div
                                className="h-full bg-accent/40 transition-all duration-500"
                                style={{ width: `${(totalVotes / votingMembers.length) * 100}%` }}
                              />
                            </div>
                          )}
                        </div>
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

      {/* Book info popover */}
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
    </div>
  )
}
