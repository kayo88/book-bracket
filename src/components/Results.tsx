import type { Book } from '../lib/types'

interface Props {
  winner: Book | null
  books: Book[]
}

export function Results({ winner, books }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12">
      <div className="max-w-sm w-full">
        {winner ? (
          <>
            <p className="text-ink-muted text-sm mb-6">the winner is</p>

            {winner.cover_url && (
              <img
                src={winner.cover_url}
                alt=""
                className="w-36 h-52 object-cover mx-auto mb-8"
              />
            )}

            <h1 className="font-serif text-3xl font-bold text-ink mb-1">
              {winner.title}
            </h1>
            <p className="text-ink-light">{winner.authors.join(', ')}</p>
            {winner.page_count && (
              <p className="text-ink-muted text-sm mt-1">{winner.page_count} pages</p>
            )}
            {winner.pitch && (
              <p className="text-ink-light italic mt-6 leading-relaxed">"{winner.pitch}"</p>
            )}

            <p className="text-ink-muted text-sm mt-10">
              time to start reading.
            </p>
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
