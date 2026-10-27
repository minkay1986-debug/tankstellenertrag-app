-- Optimize auth lookups in idea moderation RLS policies.
-- Wrapping auth.jwt() in a scalar SELECT lets PostgreSQL evaluate the JWT
-- once per statement instead of potentially re-evaluating it for each row.
-- The authorization predicates and allowed status transitions are unchanged.

drop policy if exists "Admin can read idea suggestions" on public.public_idea_suggestions;
create policy "Admin can read idea suggestions"
  on public.public_idea_suggestions
  for select to authenticated
  using (((select auth.jwt()) ->> 'email') = 'svenkrick@gmx.de');

drop policy if exists "Admin can review idea suggestions" on public.public_idea_suggestions;
create policy "Admin can review idea suggestions"
  on public.public_idea_suggestions
  for update to authenticated
  using (
    ((select auth.jwt()) ->> 'email') = 'svenkrick@gmx.de'
    and status = 'pending'
  )
  with check (
    ((select auth.jwt()) ->> 'email') = 'svenkrick@gmx.de'
    and status in ('approved', 'rejected')
    and reviewed_at is not null
    and reviewed_by = 'svenkrick@gmx.de'
  );
