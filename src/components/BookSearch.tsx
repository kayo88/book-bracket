import { useRef, useEffect } from 'react'
import type { GoogleBookResult } from '../lib/types'

interface Props {
  query: string
  setQuery: (q: string) => void
  results: GoogleBookResult[]
  searching: boolean
  onSelect: (book: GoogleBookResult) => void
  clearResults: () => void
}

export function BookSearch({ query, setQuery, results, searching, onSelect, clearResults }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        clearResults()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [clearResults])

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full bg-transparent border-b border-divider px-0 py-3 text-ink placeholder-ink-muted focus:outline-none focus:border-accent transition-colors duration-150"
        placeholder="search for a book..."
      />
      {searching && (
        <div className="absolute right-0 top-3.5 text-ink-muted text-sm">searching...</div>
      )}

      {results.length > 0 && (
        <div className="absolute z-10 w-full mt-2 bg-cream-dark max-h-80 overflow-y-auto">
          {results.map((book) => (
            <button
              key={book.id}
              onClick={() => {
                onSelect(book)
                setQuery('')
                clearResults()
              }}
              className="w-full flex items-center gap-3 px-2 py-3 hover:bg-divider text-left transition-colors duration-150"
            >
              {book.coverUrl ? (
                <img
                  src={book.coverUrl}
                  alt=""
                  className="w-10 h-14 object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-14 bg-divider flex-shrink-0 flex items-center justify-center text-ink-muted text-xs">
                  no cover
                </div>
              )}
              <div className="min-w-0">
                <p className="font-serif text-sm text-ink truncate">{book.title}</p>
                <p className="text-ink-light text-xs truncate">{book.authors.join(', ')}</p>
                {book.pageCount && (
                  <p className="text-ink-muted text-xs">{book.pageCount} pages</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
