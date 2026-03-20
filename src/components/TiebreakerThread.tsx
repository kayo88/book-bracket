import { useState, useEffect, useRef } from 'react'
import type { TiebreakerArgument, Member } from '../lib/types'
import { supabase } from '../lib/supabase'

interface Props {
  matchupId: string
  memberId: string
  members: Member[]
  onClose: () => void
}

export function TiebreakerThread({ matchupId, memberId, members, onClose }: Props) {
  const [arguments_, setArguments] = useState<TiebreakerArgument[]>([])
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const memberMap = new Map(members.map((m) => [m.id, m]))

  useEffect(() => {
    supabase
      .from('tiebreaker_arguments')
      .select('*')
      .eq('matchup_id', matchupId)
      .order('created_at')
      .then(({ data }) => {
        if (data) setArguments(data)
      })
  }, [matchupId])

  useEffect(() => {
    const channel = supabase
      .channel(`tiebreaker-${matchupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tiebreaker_arguments', filter: `matchup_id=eq.${matchupId}` },
        (payload) => {
          setArguments((prev) => [...prev, payload.new as TiebreakerArgument])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [matchupId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [arguments_])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    setSubmitting(true)
    await supabase.from('tiebreaker_arguments').insert({
      matchup_id: matchupId,
      member_id: memberId,
      body: body.trim(),
    })
    setBody('')
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-ink/30 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-cream w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-divider">
          <h3 className="font-serif text-ink">tiebreaker</h3>
          <button onClick={onClose} className="text-ink-muted hover:text-ink transition-colors duration-150 text-lg">
            &times;
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {arguments_.length === 0 && (
            <p className="text-ink-muted text-sm text-center py-6">
              it's a tie. make your case.
            </p>
          )}
          {arguments_.map((arg) => {
            const author = memberMap.get(arg.member_id)
            const isMe = arg.member_id === memberId
            return (
              <div key={arg.id} className={`${isMe ? 'ml-8' : 'mr-8'}`}>
                <p className="text-xs text-ink-muted mb-1">
                  {author?.display_name || 'unknown'}
                </p>
                <p className="text-sm text-ink leading-relaxed">{arg.body}</p>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="px-5 py-4 border-t border-divider flex gap-3">
          <input
            type="text"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="flex-1 bg-transparent border-b border-divider px-0 py-2 text-ink placeholder-ink-muted text-sm focus:outline-none focus:border-accent transition-colors duration-150"
            placeholder="make your argument..."
            maxLength={500}
          />
          <button
            type="submit"
            disabled={submitting || !body.trim()}
            className="bg-accent hover:bg-accent-hover disabled:opacity-40 text-cream font-medium px-4 py-2 text-sm transition-colors duration-150"
          >
            send
          </button>
        </form>
      </div>
    </div>
  )
}
