-- Secure public idea voting: hide individual vote rows and enforce one vote per browser key per idea.
alter table public.public_idea_votes
  add column if not exists voter_hash text;

-- Existing rows are historical and have no browser key; leave them countable.
create unique index if not exists public_idea_votes_voter_idea_unique
  on public.public_idea_votes (voter_hash, idea_id)
  where voter_hash is not null;

drop policy if exists "Anyone can read vote totals" on public.public_idea_votes;
drop policy if exists "Anyone can submit idea votes" on public.public_idea_votes;
revoke select, insert, update, delete on public.public_idea_votes from anon, authenticated;
revoke all on public.public_idea_votes from public;

-- Only the Edge Function (service role) reads/writes individual votes.
-- Public clients must obtain aggregate counts through the Edge Function.
