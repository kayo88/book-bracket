import type { Book } from '../lib/types'

interface Props {
  book: Book
  onDelete?: () => void
  onEditPitch?: () => void
  compact?: boolean
  submitterName?: string
}

export function BookCard({ book, onDelete, onEditPitch, compact, submitterName }: Props) {
  return (
    <div className={`flex gap-4 ${compact ? 'py-2' : 'py-4'}`}>
      {book.cover_url ? (
        <img
          src={book.cover_url}
          alt=""
          className={`${compact ? 'w-10 h-14' : 'w-14 h-20'} object-cover flex-shrink-0`}
        />
      ) : (
        <div className={`${compact ? 'w-10 h-14' : 'w-14 h-20'} bg-cream-dark flex-shrink-0 flex items-center justify-center text-ink-muted text-xs`}>
          no cover
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className={`font-serif text-ink ${compact ? 'text-sm' : 'text-base'} truncate`}>
          {book.title}
        </h3>
        <p className="text-ink-light text-sm truncate">{book.authors.join(', ')}</p>
        {submitterName && (
          <p className="text-ink-muted text-xs mt-0.5">submitted by {submitterName}</p>
        )}
        {book.page_count && !compact && (
          <p className="text-ink-muted text-xs mt-0.5">{book.page_count} pages</p>
        )}
        {book.pitch && !compact && (
          <p className="text-ink-light text-sm mt-2 italic leading-relaxed">"{book.pitch}"</p>
        )}
        {(onDelete || onEditPitch) && (
          <div className="flex gap-3 mt-2">
            {onEditPitch && (
              <button
                onClick={onEditPitch}
                className="text-xs text-accent hover:text-accent-hover transition-colors duration-150"
              >
                edit pitch
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="text-xs text-error hover:opacity-70 transition-opacity duration-150"
              >
                remove
              </button>
            )}
          </div>
        )}
      </div>
      {book.seed && (
        <div className="flex-shrink-0 text-ink-muted text-xs font-medium pt-1">
          #{book.seed}
        </div>
      )}
    </div>
  )
}
