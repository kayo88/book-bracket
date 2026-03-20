import { useState } from 'react'
import type { Book, Session, GoogleBookResult, Member } from '../lib/types'
import { BookSearch } from './BookSearch'
import { BookCard } from './BookCard'
import { PitchEditor } from './PitchEditor'
import { useBookSearch } from '../hooks/useBookSearch'

interface Props {
  session: Session
  books: Book[]
  members: Member[]
  totalBookCount: number
  submissionDeadline: string | null
  onSubmitBook: (book: GoogleBookResult, pitch: string | null) => Promise<void>
  onDeleteBook: (bookId: string) => void
  onGenerateBracket: () => void
}

export function Lobby({ session, books, members, totalBookCount, submissionDeadline, onSubmitBook, onDeleteBook, onGenerateBracket }: Props) {
  const { query, setQuery, results, searching, clearResults } = useBookSearch()
  const [selectedBook, setSelectedBook] = useState<GoogleBookResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const myBooks = books.filter((b) => b.submitted_by === session.memberId)

  const handleSelect = (book: GoogleBookResult) => {
    setSelectedBook(book)
  }

  const handleConfirmSubmit = async (pitch: string) => {
    if (!selectedBook) return
    setSubmitting(true)
    try {
      await onSubmitBook(selectedBook, pitch || null)
      setSelectedBook(null)
    } catch {
      // Handle error
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-8">
      <div className="mb-12">
        <h1 className="font-serif text-3xl font-bold text-ink mb-1">book bracket</h1>
        <p className="text-ink-muted">
          {totalBookCount} of 16 books submitted
        </p>
        {submissionDeadline && (
          <p className="text-ink-muted text-sm mt-1">
            submissions close {new Date(submissionDeadline).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Submission area — members only */}
      {session.role !== 'organizer' && (
        myBooks.length >= 2 ? (
          <div className="mb-10">
            <p className="text-ink-muted text-sm">you're all set — 2 books submitted.</p>
          </div>
        ) : !selectedBook ? (
          <div className="mb-10">
            <BookSearch
              query={query}
              setQuery={setQuery}
              results={results}
              searching={searching}
              onSelect={handleSelect}
              clearResults={clearResults}
            />
          </div>
        ) : (
          <div className="mb-10">
            <PitchEditor
              book={selectedBook}
              initialPitch=""
              onConfirm={handleConfirmSubmit}
              onCancel={() => setSelectedBook(null)}
            />
            {submitting && (
              <p className="text-ink-muted text-sm mt-2">submitting...</p>
            )}
          </div>
        )
      )}

      {/* My submissions — members only */}
      {session.role !== 'organizer' && myBooks.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xs font-medium text-ink-muted tracking-wide mb-2">your submissions</h2>
          <div className="divide-y divide-divider">
            {myBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onDelete={() => onDeleteBook(book.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Organizer: all submissions */}
      {session.role === 'organizer' && books.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xs font-medium text-ink-muted tracking-wide mb-2">all submissions</h2>
          <div className="divide-y divide-divider">
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                submitterName={members.find(m => m.id === book.submitted_by)?.display_name}
              />
            ))}
          </div>
        </div>
      )}

      {/* Organizer controls */}
      {session.role === 'organizer' && (
        <div className="pt-8 border-t border-divider">
          <button
            onClick={onGenerateBracket}
            disabled={totalBookCount < 16}
            className="w-full bg-accent hover:bg-accent-hover disabled:opacity-40 text-cream font-medium py-3 transition-colors duration-150"
          >
            {totalBookCount < 16 ? `${totalBookCount} of 16 books — waiting` : 'generate bracket'}
          </button>
          <p className="text-ink-muted text-xs mt-2 text-center">
            this will randomize seedings and start the tournament.
          </p>
        </div>
      )}
    </div>
  )
}
