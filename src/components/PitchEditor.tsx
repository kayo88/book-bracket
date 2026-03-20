import { useState } from 'react'
import type { GoogleBookResult } from '../lib/types'

interface Props {
  book: GoogleBookResult
  initialPitch: string
  onConfirm: (pitch: string) => void
  onCancel: () => void
}

export function PitchEditor({ book, initialPitch, onConfirm, onCancel }: Props) {
  const [pitch, setPitch] = useState(initialPitch)
  const [generating, setGenerating] = useState(false)

  const generatePitch = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/generate-pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: book.title,
          authors: book.authors,
          pageCount: book.pageCount,
          description: book.description,
        }),
      })
      if (res.ok) {
        const { pitch: generated } = await res.json()
        setPitch(generated)
      }
    } catch {
      // Silently fail — user can write their own
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="py-4">
      <div className="flex items-center gap-4 mb-6">
        {book.coverUrl && (
          <img src={book.coverUrl} alt="" className="w-12 h-16 object-cover flex-shrink-0" />
        )}
        <div>
          <h3 className="font-serif text-ink">{book.title}</h3>
          <p className="text-ink-light text-sm">{book.authors.join(', ')}</p>
        </div>
      </div>

      <label className="block text-sm text-ink-light mb-2">
        why should we read this?
      </label>
      <textarea
        value={pitch}
        onChange={(e) => setPitch(e.target.value)}
        className="w-full bg-transparent border-b border-divider px-0 py-2 text-ink placeholder-ink-muted focus:outline-none focus:border-accent text-sm resize-none transition-colors duration-150"
        rows={3}
        placeholder="write a pitch or generate one..."
        maxLength={500}
      />

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={generatePitch}
          disabled={generating}
          className="text-sm text-accent hover:text-accent-hover disabled:opacity-40 transition-colors duration-150"
        >
          {generating ? 'generating...' : 'generate pitch'}
        </button>
        {pitch && (
          <button
            onClick={() => setPitch('')}
            className="text-sm text-ink-muted hover:text-ink-light transition-colors duration-150"
          >
            clear
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={onCancel}
          className="text-sm text-ink-muted hover:text-ink-light transition-colors duration-150"
        >
          cancel
        </button>
        <button
          onClick={() => onConfirm(pitch)}
          className="text-sm bg-accent hover:bg-accent-hover text-cream font-medium px-5 py-2 transition-colors duration-150"
        >
          submit
        </button>
      </div>
    </div>
  )
}
