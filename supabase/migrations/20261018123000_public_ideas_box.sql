-- Public ideas box: anonymous voting and idea submissions.
-- Do not expose suggestion text or individual vote records publicly.
create table if not exists public.public_idea_votes (
  id bigint generated always as identity primary key,
  idea_id text not null check (idea_id in ('stockout','packaging','weather','staff')),
  created_at timestamptz not null default now()
);
create table if not exists public.public_idea_suggestions (
  id bigint generated always as identity primary key,
  suggestion text not null check (char_length(trim(suggestion)) between 8 and 500),
  created_at timestamptz not null default now()
);
alter table public.public_idea_votes enable row level security;
alter table public.public_idea_suggestions enable row level security;
drop policy if exists "Anyone can submit idea votes" on public.public_idea_votes;
create policy "Anyone can submit idea votes" on public.public_idea_votes for insert to anon, authenticated with check (idea_id in ('stockout','packaging','weather','staff'));
drop policy if exists "Anyone can read vote totals" on public.public_idea_votes;
create policy "Anyone can read vote totals" on public.public_idea_votes for select to anon, authenticated using (true);
drop policy if exists "Anyone can submit idea suggestions" on public.public_idea_suggestions;
create policy "Anyone can submit idea suggestions" on public.public_idea_suggestions for insert to anon, authenticated with check (char_length(trim(suggestion)) between 8 and 500);
-- No public SELECT/UPDATE/DELETE policy on suggestions: submissions remain private.
revoke all on public.public_idea_votes from public;
revoke all on public.public_idea_suggestions from public;
grant select, insert on public.public_idea_votes to anon, authenticated;
grant usage, select on sequence public.public_idea_votes_id_seq to anon, authenticated;
grant insert on public.public_idea_suggestions to anon, authenticated;
grant usage, select on sequence public.public_idea_suggestions_id_seq to anon, authenticated;
