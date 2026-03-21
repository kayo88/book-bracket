import { Fragment, useState, useMemo, useCallback, useRef } from 'react'
import type { Matchup as MatchupType, Book, Session, Member, Vote } from '../lib/types'
import { getNextMatchup } from '../lib/bracket'

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

function Connector({ pairCount, pairHeight }: { pairCount: number; pairHeight: number }) {
  return (
    <div className="flex flex-col flex-shrink-0 w-4 md:w-8">
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

function InfoIcon({ onClick, className = '' }: { onClick: (e: React.MouseEvent) => void; className?: string }) {
  return (
    <button onClick={onClick} className={`text-ink-muted/40 hover:text-accent flex-shrink-0 transition-colors p-0.5 ${className}`}>
      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="6.5" />
        <path d="M8 7v4M8 5.5v-.01" strokeLinecap="round" />
      </svg>
    </button>
  )
}

export function Bracket({
  matchups, books, session, members, myVotes, voteCounts,
  allVotedMatchups, votes, onVote, onTiebreaker: _, onAdvance, currentRound,
}: Props) {
  const bookMap = useMemo(() => new Map(books.map((b) => [b.id, b])), [books])
  const totalRounds = Math.max(...matchups.map((m) => m.round), 0)

  const [picks, setPicks] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null)

  const currentRoundMatchups = matchups.filter(m => m.round === currentRound)
  const votableMatchups = currentRoundMatchups.filter(m => m.status === 'voting')
  const alreadyVoted = votableMatchups.length > 0 && votableMatchups.every(m => myVotes[m.id])

  const membersDoneCount = useMemo(() => {
    if (votableMatchups.length === 0) return 0
    return members.filter(member =>
      votableMatchups.every(matchup =>
        votes.some(v => v.matchup_id === matchup.id && v.member_id === member.id)
      )
    ).length
  }, [votes, votableMatchups, members])

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

  const previewSlots = useMemo(() => {
    const map: Record<string, string> = {}
    for (const matchup of votableMatchups) {
      const pickId = myVotes[matchup.id] || picks[matchup.id]
      if (pickId) {
        const next = getNextMatchup(matchup.round, matchup.position)
        map[`${next.round}-${next.position}-${next.slot}`] = pickId
      }
    }
    return map
  }, [votableMatchups, picks, myVotes])

  const allPicked = votableMatchups.length > 0 && votableMatchups.every(m => picks[m.id] || myVotes[m.id])
  const pickedCount = votableMatchups.filter(m => picks[m.id] || myVotes[m.id]).length

  const handlePick = (matchupId: string, bookId: string) => {
    setPicks(prev => ({ ...prev, [matchupId]: bookId }))
  }

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    for (const [matchupId, bookId] of Object.entries(picks)) {
      await onVote(matchupId, bookId)
    }
    setSubmitted(true)
    setSubmitting(false)
  }, [picks, onVote])

  const toggleBookInfo = (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation()
    setExpandedBookId(prev => prev === bookId ? null : bookId)
  }

  // Double tap for mobile book info
  const lastTapRef = useRef<{ bookId: string; time: number } | null>(null)

  const roundLabel = (round: number) => {
    if (round === totalRounds) return 'FINALS 🏆'
    if (round === totalRounds - 1) return 'semis'
    if (round === totalRounds - 2) return 'quarters'
    return `round ${round}`
  }

  const isDone = alreadyVoted || submitted

  // Responsive matchup height: 56px mobile (h-7 slots), 80px desktop (h-10 slots)
  const MATCHUP_H = useMemo(() => {
    return window.matchMedia('(min-width: 768px)').matches ? 80 : 56
  }, [])

  return (
    <div className="py-4 md:py-8">
      <div className="px-4 md:px-5 mb-3 md:mb-4">
        <h1 className="font-serif text-2xl md:text-3xl font-bold text-ink mb-1">book bracket</h1>
        <p className="text-ink-muted text-xs md:text-sm">{roundLabel(currentRound)}</p>
      </div>

      {/* Tie banner */}
      {hasTies && (
        <div className="px-4 md:px-5 mb-3">
          <div className="border border-error/30 bg-error/5 px-3 py-2">
            {[...tiedMatchups, ...tiebreakerMatchups].map(m => {
              const bookA = bookMap.get(m.book_a!)!
              const bookB = bookMap.get(m.book_b!)!
              return (
                <div key={m.id} className="mb-2 last:mb-0">
                  <p className="text-xs text-error">{bookA.title} vs {bookB.title} — tied</p>
                  {session.role === 'organizer' && (
                    <div className="flex gap-3 mt-1">
                      <button onClick={() => onAdvance(m, bookA.id)} className="text-xs text-accent hover:text-accent-hover">advance "{bookA.title}"</button>
                      <button onClick={() => onAdvance(m, bookB.id)} className="text-xs text-accent hover:text-accent-hover">advance "{bookB.title}"</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Done banner */}
      {isDone && (
        <div className="px-4 md:px-5 mb-3">
          <div className="border border-accent/20 bg-accent/5 px-3 py-2">
            <p className="text-xs text-accent">
              you're all set — waiting on {members.length - membersDoneCount} more
            </p>
          </div>
        </div>
      )}

      {/* Bracket — scrolls horizontally on all screens */}
      <div className="overflow-x-auto px-3 md:px-5 pb-4">
        <div className="flex">
          {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => {
            const roundMatchups = matchups
              .filter((m) => m.round === round)
              .sort((a, b) => a.position - b.position)

            const isFutureRound = round > currentRound
            const isCurrentRound = round === currentRound

            return (
              <Fragment key={round}>
                <div className="flex flex-col flex-shrink-0">
                  {roundMatchups.map((matchup) => {
                    const bookA = matchup.book_a ? bookMap.get(matchup.book_a) ?? null : null
                    const bookB = matchup.book_b ? bookMap.get(matchup.book_b) ?? null : null
                    const isVoting = matchup.status === 'voting'
                    const isComplete = matchup.status === 'complete'
                    const myVote = myVotes[matchup.id] || null
                    const myPick = picks[matchup.id] || null
                    const activeChoice = myVote || myPick
                    const canPick = isCurrentRound && isVoting && !myVote && !alreadyVoted

                    const previewA = isFutureRound ? previewSlots[`${round}-${matchup.position}-a`] : null
                    const previewB = isFutureRound ? previewSlots[`${round}-${matchup.position}-b`] : null
                    const displayA = bookA || (previewA ? bookMap.get(previewA) ?? null : null)
                    const displayB = bookB || (previewB ? bookMap.get(previewB) ?? null : null)
                    const isPreviewA = !bookA && !!displayA
                    const isPreviewB = !bookB && !!displayB

                    const slotStyle = (book: Book | null, isPreview: boolean) => {
                      if (!book) return 'text-ink-muted'
                      if (isPreview) return 'text-accent/50'
                      if (matchup.winner === book.id) return 'text-accent font-medium bg-accent/10'
                      if (matchup.winner && matchup.winner !== book.id) return 'text-ink-muted line-through opacity-40'
                      if (activeChoice === book.id) return 'text-accent bg-accent/5 font-medium'
                      if (canPick) return 'text-ink hover:bg-accent/5 cursor-pointer'
                      return 'text-ink'
                    }

                    const handleSlotClick = (e: React.MouseEvent, book: Book | null) => {
                      if (!book || !canPick) return
                      e.stopPropagation()
                      handlePick(matchup.id, book.id)
                    }

                    // Use CSS classes for responsive height instead of inline styles
                    // Mobile matchup height, desktop matchup height
                    const wrapperH = MATCHUP_H * Math.pow(2, round - 1)

                    return (
                      <div
                        key={matchup.id}
                        className="flex items-center"
                        style={{ height: wrapperH }}
                      >
                        <div className={`${round === 1 ? 'w-48 md:w-72' : round === 2 ? 'w-32 md:w-56' : 'w-32 md:w-48'} border text-left transition-all ${
                          isFutureRound ? 'border-divider/50 opacity-75'
                            : isVoting && canPick ? 'border-accent/30'
                            : isComplete ? 'border-divider opacity-70'
                            : 'border-divider'
                        }`}>
                          {/* Slot A */}
                          <div
                            className={`h-7 md:h-10 flex items-center gap-1 md:gap-1.5 px-1.5 md:px-2.5 text-[11px] md:text-sm transition-all ${slotStyle(displayA, isPreviewA)}`}
                            onClick={(e) => {
                              const now = Date.now()
                              if (displayA && lastTapRef.current?.bookId === displayA.id && now - lastTapRef.current.time < 350) {
                                e.stopPropagation(); lastTapRef.current = null; setExpandedBookId(prev => prev === displayA.id ? null : displayA.id); return
                              }
                              lastTapRef.current = displayA ? { bookId: displayA.id, time: now } : null
                              handleSlotClick(e, bookA)
                            }}
                          >
                            <span className="text-ink-muted/60 w-3 text-right text-[9px] md:text-[10px] flex-shrink-0">{displayA?.seed ?? ''}</span>
                            <span className="truncate flex-1">{displayA?.title ?? 'tbd'}</span>
                            {bookA && !isFutureRound && <InfoIcon onClick={(e) => toggleBookInfo(e, bookA.id)} className="hidden md:inline-flex" />}
                            {activeChoice === bookA?.id && <span className="text-accent text-[7px] md:text-[8px] flex-shrink-0">●</span>}
                          </div>
                          <div className="border-t border-error/30" />
                          {/* Slot B */}
                          <div
                            className={`h-7 md:h-10 flex items-center gap-1 md:gap-1.5 px-1.5 md:px-2.5 text-[11px] md:text-sm transition-all ${slotStyle(displayB, isPreviewB)}`}
                            onClick={(e) => {
                              const now = Date.now()
                              if (displayB && lastTapRef.current?.bookId === displayB.id && now - lastTapRef.current.time < 350) {
                                e.stopPropagation(); lastTapRef.current = null; setExpandedBookId(prev => prev === displayB.id ? null : displayB.id); return
                              }
                              lastTapRef.current = displayB ? { bookId: displayB.id, time: now } : null
                              handleSlotClick(e, bookB)
                            }}
                          >
                            <span className="text-ink-muted/60 w-3 text-right text-[9px] md:text-[10px] flex-shrink-0">{displayB?.seed ?? ''}</span>
                            <span className="truncate flex-1">{displayB?.title ?? 'tbd'}</span>
                            {bookB && !isFutureRound && <InfoIcon onClick={(e) => toggleBookInfo(e, bookB.id)} className="hidden md:inline-flex" />}
                            {activeChoice === bookB?.id && <span className="text-accent text-[7px] md:text-[8px] flex-shrink-0">●</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {round < totalRounds && (
                  <Connector
                    pairCount={roundMatchups.length / 2}
                    pairHeight={MATCHUP_H * Math.pow(2, round)}
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
          <div className="max-w-md mx-auto px-4 md:px-5 mt-2 mb-4">
            <div className="border border-divider p-3 md:p-4 bg-cream-dark/30">
              <div className="flex items-start gap-3 mb-2">
                {book.cover_url && <img src={book.cover_url} alt="" className="w-10 h-14 object-cover flex-shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-serif text-sm text-ink leading-tight">{book.title}</h4>
                      <p className="text-xs text-ink-light mt-0.5">{book.authors.join(', ')}</p>
                    </div>
                    <button onClick={() => setExpandedBookId(null)} className="text-ink-muted hover:text-ink text-xs ml-2 flex-shrink-0">×</button>
                  </div>
                </div>
              </div>
              {book.pitch && <p className="text-xs text-ink-muted italic leading-relaxed mt-2">"{book.pitch}"</p>}
              {book.page_count && <p className="text-[10px] text-ink-muted mt-1">{book.page_count} pages</p>}
            </div>
          </div>
        )
      })()}

      {/* Submit area — below bracket on mobile, below on desktop too for simplicity */}
      {!isDone && (
        <div className="px-4 md:px-5 pt-4 border-t border-divider mt-2">
          {allPicked ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full md:w-auto bg-accent hover:bg-accent-hover disabled:opacity-40 text-cream font-medium py-3 px-8 text-sm transition-colors"
            >
              {submitting ? 'submitting...' : 'submit votes'}
            </button>
          ) : (
            <p className="text-xs text-ink-muted">
              {pickedCount > 0
                ? `${pickedCount} of ${votableMatchups.length} picked — tap a book to choose`
                : 'tap a book in each matchup to pick a winner'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
