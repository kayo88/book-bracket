export type Phase = 'submissions' | 'bracket' | 'complete'
export type Role = 'member' | 'organizer'
export type MatchupStatus = 'pending' | 'voting' | 'tiebreaker' | 'complete'

export interface Club {
  id: string
  phase: Phase
  current_round: number
  submission_deadline: string | null
  created_at: string
}

export interface Member {
  id: string
  club_id: string
  display_name: string
  role: Role
  created_at: string
}

export interface Book {
  id: string
  club_id: string
  title: string
  authors: string[]
  cover_url: string | null
  page_count: number | null
  description: string | null
  pitch: string | null
  submitted_by: string
  seed: number | null
  created_at: string
}

export interface Matchup {
  id: string
  club_id: string
  round: number
  position: number
  book_a: string | null
  book_b: string | null
  winner: string | null
  status: MatchupStatus
  created_at: string
}

export interface Vote {
  id: string
  matchup_id: string
  member_id: string
  book_id: string
  created_at: string
}

export interface TiebreakerArgument {
  id: string
  matchup_id: string
  member_id: string
  body: string
  created_at: string
}

export interface Session {
  memberId: string
  displayName: string
  role: Role
  clubId: string
}

export interface GoogleBookResult {
  id: string
  title: string
  authors: string[]
  coverUrl: string | null
  pageCount: number | null
  description: string | null
}
