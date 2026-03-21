import { useEffect, useState } from 'react'
import type { Book, Member, Vote, Matchup } from '../lib/types'

interface Props {
  winner: Book | null
  books: Book[]
  members: Member[]
  votes: Vote[]
  matchups: Matchup[]
}

function Confetti() {
  const [particles] = useState(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      color: ['#c4714a', '#d4956b', '#8b6f5e', '#b8977e', '#e8c4a8', '#d4a574'][Math.floor(Math.random() * 6)],
      size: 4 + Math.random() * 6,
      rotation: Math.random() * 360,
    }))
  )

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti"
          style={{
            left: `${p.left}%`,
            top: -20,
            width: p.size,
            height: p.size * 1.5,
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg)`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </div>
  )
}

export function Results({ winner, books, members, votes, matchups }: Props) {
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  const memberMap = new Map(members.map(m => [m.id, m.display_name]))

  // Group books by submitter
  const submissions = members.map(m => ({
    name: m.display_name,
    books: books.filter(b => b.submitted_by === m.id),
  })).filter(s => s.books.length > 0)

  return (
    <div className="min-h-screen flex flex-col items-center px-5 py-12">
      {showConfetti && winner && <Confetti />}

      <div className="max-w-sm w-full">
        {winner ? (
          <>
            <p className="text-ink-muted text-sm mb-6 text-center">the winner is</p>

            {winner.cover_url && (
              <img
                src={winner.cover_url}
                alt=""
                className="w-36 h-52 object-cover mx-auto mb-8 shadow-lg"
              />
            )}

            <h1 className="font-serif text-3xl font-bold text-ink mb-1 text-center">
              {winner.title}
            </h1>
            <p className="text-ink-light text-center">{winner.authors.join(', ')}</p>
            {winner.page_count && (
              <p className="text-ink-muted text-sm mt-1 text-center">{winner.page_count} pages</p>
            )}
            {winner.pitch && (
              <p className="text-ink-light italic mt-6 leading-relaxed text-center">"{winner.pitch}"</p>
            )}

            <p className="text-ink-muted text-sm mt-8 text-center">
              submitted by {memberMap.get(winner.submitted_by) || 'unknown'}
            </p>

            <p className="text-ink-muted text-sm mt-2 text-center">
              time to start reading.
            </p>

            {/* Finals vote breakdown */}
            {(() => {
              const finalRound = Math.max(...matchups.map(m => m.round))
              const finalMatchup = matchups.find(m => m.round === finalRound)
              if (!finalMatchup) return null
              const finalVotes = votes.filter(v => v.matchup_id === finalMatchup.id)
              const bookAVoters = finalVotes.filter(v => v.book_id === finalMatchup.book_a).map(v => memberMap.get(v.member_id) || '?')
              const bookBVoters = finalVotes.filter(v => v.book_id === finalMatchup.book_b).map(v => memberMap.get(v.member_id) || '?')
              const bookA = books.find(b => b.id === finalMatchup.book_a)
              const bookB = books.find(b => b.id === finalMatchup.book_b)
              if (!bookA || !bookB) return null
              const aIsWinner = finalMatchup.winner === bookA.id
              return (
                <div className="mt-16 pt-8 border-t border-divider">
                  <h2 className="text-xs font-medium text-ink-muted tracking-wide mb-4">how the finals went</h2>
                  <div className="space-y-3">
                    <div>
                      <p className={`text-sm font-medium mb-0.5 ${aIsWinner ? 'text-accent' : 'text-ink-light'}`}>
                        {bookA.title} — {bookAVoters.length}
                      </p>
                      <p className="text-xs text-ink-muted">{bookAVoters.join(', ') || 'no votes'}</p>
                    </div>
                    <div>
                      <p className={`text-sm font-medium mb-0.5 ${!aIsWinner ? 'text-accent' : 'text-ink-light'}`}>
                        {bookB.title} — {bookBVoters.length}
                      </p>
                      <p className="text-xs text-ink-muted">{bookBVoters.join(', ') || 'no votes'}</p>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Who submitted what */}
            <div className="mt-16 pt-8 border-t border-divider">
              <h2 className="text-xs font-medium text-ink-muted tracking-wide mb-4">who submitted what</h2>
              <div className="space-y-4">
                {submissions.map(({ name, books: memberBooks }) => (
                  <div key={name}>
                    <p className="text-sm text-ink font-medium mb-1">{name}</p>
                    <div className="space-y-1">
                      {memberBooks.map(book => (
                        <div key={book.id} className="flex items-center gap-2">
                          {book.cover_url && (
                            <img src={book.cover_url} alt="" className="w-5 h-7 object-cover flex-shrink-0" />
                          )}
                          <span className={`text-xs ${book.id === winner.id ? 'text-accent font-medium' : 'text-ink-light'}`}>
                            {book.title}
                            {book.id === winner.id && ' — champion'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div>
            <h1 className="font-serif text-3xl font-bold text-ink mb-2">tournament complete</h1>
            <p className="text-ink-muted">
              {books.length} books competed. check the bracket for results.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
