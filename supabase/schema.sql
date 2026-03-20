-- Book Bracket Schema
-- Run this in Supabase SQL Editor to set up the database

-- Clubs table (tournament config)
create table clubs (
  id uuid primary key default gen_random_uuid(),
  phase text not null default 'submissions' check (phase in ('submissions', 'bracket', 'complete')),
  current_round int not null default 1,
  submission_deadline timestamptz,
  created_at timestamptz not null default now()
);

-- Members table
create table members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  display_name text not null,
  role text not null default 'member' check (role in ('member', 'organizer')),
  created_at timestamptz not null default now()
);

-- Books table
create table books (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  title text not null,
  authors text[] not null default '{}',
  cover_url text,
  page_count int,
  description text,
  pitch text,
  submitted_by uuid not null references members(id) on delete cascade,
  seed int,
  created_at timestamptz not null default now()
);

-- Matchups table
create table matchups (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  round int not null,
  position int not null,
  book_a uuid references books(id),
  book_b uuid references books(id),
  winner uuid references books(id),
  status text not null default 'pending' check (status in ('pending', 'voting', 'tiebreaker', 'complete')),
  created_at timestamptz not null default now()
);

-- Votes table
create table votes (
  id uuid primary key default gen_random_uuid(),
  matchup_id uuid not null references matchups(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(matchup_id, member_id)
);

-- Tiebreaker arguments table
create table tiebreaker_arguments (
  id uuid primary key default gen_random_uuid(),
  matchup_id uuid not null references matchups(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- Enable RLS but with permissive policies (friend-group trust model)
alter table clubs enable row level security;
alter table members enable row level security;
alter table books enable row level security;
alter table matchups enable row level security;
alter table votes enable row level security;
alter table tiebreaker_arguments enable row level security;

-- Permissive policies for anon access
create policy "Allow all on clubs" on clubs for all using (true) with check (true);
create policy "Allow all on members" on members for all using (true) with check (true);
create policy "Allow all on books" on books for all using (true) with check (true);
create policy "Allow all on matchups" on matchups for all using (true) with check (true);
create policy "Allow all on votes" on votes for all using (true) with check (true);
create policy "Allow all on tiebreaker_arguments" on tiebreaker_arguments for all using (true) with check (true);

-- Enable realtime
alter publication supabase_realtime add table clubs;
alter publication supabase_realtime add table books;
alter publication supabase_realtime add table matchups;
alter publication supabase_realtime add table votes;
alter publication supabase_realtime add table tiebreaker_arguments;
