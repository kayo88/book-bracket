import { useState, useEffect, useCallback } from 'react'
import type { Book, GoogleBookResult } from '../lib/types'
import { supabase } from '../lib/supabase'

export function useBooks(clubId: string | null) {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clubId) return

    supabase
      .from('books')
      .select('*')
      .eq('club_id', clubId)
      .order('created_at')
      .then(({ data }) => {
        if (data) setBooks(data)
        setLoading(false)
      })
  }, [clubId])

  // Realtime
  useEffect(() => {
    if (!clubId) return

    const channel = supabase
      .channel('books-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'books', filter: `club_id=eq.${clubId}` },
        () => {
          supabase
            .from('books')
            .select('*')
            .eq('club_id', clubId)
            .order('created_at')
            .then(({ data }) => {
              if (data) setBooks(data)
            })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [clubId])

  const submitBook = useCallback(async (
    book: GoogleBookResult,
    pitch: string | null,
    memberId: string
  ) => {
    if (!clubId) return null
    const { data, error } = await supabase
      .from('books')
      .insert({
        club_id: clubId,
        title: book.title,
        authors: book.authors,
        cover_url: book.coverUrl,
        page_count: book.pageCount,
        description: book.description,
        pitch,
        submitted_by: memberId,
      })
      .select()
      .single()

    if (error) throw error
    return data as Book
  }, [clubId])

  const updatePitch = useCallback(async (bookId: string, pitch: string) => {
    await supabase.from('books').update({ pitch }).eq('id', bookId)
  }, [])

  const deleteBook = useCallback(async (bookId: string) => {
    setBooks(prev => prev.filter(b => b.id !== bookId))
    await supabase.from('books').delete().eq('id', bookId)
  }, [])

  return { books, loading, submitBook, updatePitch, deleteBook }
}
