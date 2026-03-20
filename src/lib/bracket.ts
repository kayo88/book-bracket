import type { Book } from './types'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Pad to next power of 2 with byes (nulls)
function padToPowerOf2(books: Book[]): (Book | null)[] {
  let size = 1
  while (size < books.length) size *= 2
  const padded: (Book | null)[] = [...books]
  while (padded.length < size) padded.push(null)
  return padded
}

export interface GeneratedMatchup {
  round: number
  position: number
  book_a: string | null
  book_b: string | null
}

export function generateBracket(books: Book[]): {
  matchups: GeneratedMatchup[]
  seededBooks: { id: string; seed: number }[]
  totalRounds: number
} {
  const shuffled = shuffle(books)
  const padded = padToPowerOf2(shuffled)
  const totalRounds = Math.log2(padded.length)

  // Assign seeds
  const seededBooks = shuffled.map((book, i) => ({
    id: book.id,
    seed: i + 1,
  }))

  const matchups: GeneratedMatchup[] = []

  // Round 1: pair up books
  const round1Count = padded.length / 2
  for (let i = 0; i < round1Count; i++) {
    matchups.push({
      round: 1,
      position: i,
      book_a: padded[i * 2]?.id || null,
      book_b: padded[i * 2 + 1]?.id || null,
    })
  }

  // Later rounds: empty matchups to be filled as winners advance
  for (let round = 2; round <= totalRounds; round++) {
    const matchCount = padded.length / Math.pow(2, round)
    for (let i = 0; i < matchCount; i++) {
      matchups.push({
        round,
        position: i,
        book_a: null,
        book_b: null,
      })
    }
  }

  return { matchups, seededBooks, totalRounds }
}

// Determine which matchup a winner should advance into
export function getNextMatchup(round: number, position: number): { round: number; position: number; slot: 'a' | 'b' } {
  return {
    round: round + 1,
    position: Math.floor(position / 2),
    slot: position % 2 === 0 ? 'a' : 'b',
  }
}
