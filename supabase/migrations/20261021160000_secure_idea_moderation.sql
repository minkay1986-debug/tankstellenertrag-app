-- Secure moderation workflow for public idea suggestions.
-- Public visitors can submit ideas but cannot read, change, approve, or delete them.
-- Admin access is enforced by RLS; no SECURITY DEFINER functions are introduced.

create table if not exists public.public_idea_suggestions (
  id bigint generated always as identity primary key,
  suggestion text not null check (char_length(trim(suggestion)) between 8 and 500),
  created_at timestamptz not null default now()
);
alter table public.public_idea_suggestions enable row level security;

alter table public.public_idea_suggestions
  add column if not exists status text not null default 'pending',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by text;

alter table public.public_idea_suggestions
  drop constraint if exists public_idea_suggestions_status_check;
alter table public.public_idea_suggestions
  add constraint public_idea_suggestions_status_check
  check (status in ('pending', 'approved', 'rejected'));

-- Revoke broad grants, then grant only the minimum required privileges.
revoke all on table public.public_idea_suggestions from public, anon, authenticated;
grant insert on table public.public_idea_suggestions to anon, authenticated;
grant select on table public.public_idea_suggestions to authenticated;
grant update (status, reviewed_at, reviewed_by) on table public.public_idea_suggestions to authenticated;

revoke select on sequence public.public_idea_suggestions_id_seq from anon, authenticated;
grant usage on sequence public.public_idea_suggestions_id_seq to anon, authenticated;

drop policy if exists "Anyone can submit idea suggestions" on public.public_idea_suggestions;
create policy "Anyone can submit idea suggestions"
  on public.public_idea_suggestions
  for insert to anon, authenticated
  with check (
    char_length(trim(suggestion)) between 8 and 500
    and status = 'pending'
    and reviewed_at is null
    and reviewed_by is null
  );

drop policy if exists "Admin can read idea suggestions" on public.public_idea_suggestions;
create policy "Admin can read idea suggestions"
  on public.public_idea_suggestions
  for select to authenticated
  using ((auth.jwt() ->> 'email') = 'svenkrick@gmx.de');

drop policy if exists "Admin can review idea suggestions" on public.public_idea_suggestions;
create policy "Admin can review idea suggestions"
  on public.public_idea_suggestions
  for update to authenticated
  using (
    (auth.jwt() ->> 'email') = 'svenkrick@gmx.de'
    and status = 'pending'
  )
  with check (
    (auth.jwt() ->> 'email') = 'svenkrick@gmx.de'
    and status in ('approved', 'rejected')
    and reviewed_at is not null
    and reviewed_by = 'svenkrick@gmx.de'
  );
