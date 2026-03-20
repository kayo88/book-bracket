import type { GoogleBookResult } from './types'

const API_BASE = 'https://www.googleapis.com/books/v1/volumes'

export async function searchBooks(query: string): Promise<GoogleBookResult[]> {
  if (!query.trim()) return []

  const apiKey = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY
  const keyParam = apiKey ? `&key=${apiKey}` : ''
  const res = await fetch(`${API_BASE}?q=${encodeURIComponent(query)}&maxResults=8${keyParam}`)
  if (!res.ok) return []

  const data = await res.json()
  if (!data.items) return []

  return data.items.map((item: any) => {
    const info = item.volumeInfo
    return {
      id: item.id,
      title: info.title || 'Unknown Title',
      authors: info.authors || ['Unknown Author'],
      coverUrl: info.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
      pageCount: info.pageCount || null,
      description: info.description || null,
    }
  })
}
