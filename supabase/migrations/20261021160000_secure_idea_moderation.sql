-- Secure moderation workflow for public idea suggestions.
-- Public visitors can submit ideas but cannot read, change, approve, or delete them.
-- Only the configured administrator can review submissions through narrowly scoped RPCs.

alter table public.public_idea_suggestions
  add column if not exists status text not null default 'pending',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by text;

alter table public.public_idea_suggestions
  drop constraint if exists public_idea_suggestions_status_check;
alter table public.public_idea_suggestions
  add constraint public_idea_suggestions_status_check
  check (status in ('pending', 'approved', 'rejected'));

-- Keep direct table access minimal; RPCs below are the only moderation interface.
revoke all on table public.public_idea_suggestions from public, anon, authenticated;
grant insert on table public.public_idea_suggestions to anon, authenticated;
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
  using ((auth.jwt() ->> 'email') = 'svenkrick@gmx.de')
  with check (
    (auth.jwt() ->> 'email') = 'svenkrick@gmx.de'
    and status in ('pending', 'approved', 'rejected')
  );

-- Do not expose the table through direct grants; the admin-only SECURITY DEFINER
-- RPCs are additionally guarded by the verified JWT email.
create or replace function public.get_admin_idea_suggestions()
returns table (
  id bigint,
  suggestion text,
  created_at timestamptz,
  status text,
  reviewed_at timestamptz,
  reviewed_by text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or (auth.jwt() ->> 'email') is distinct from 'svenkrick@gmx.de' then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
    select s.id, s.suggestion, s.created_at, s.status, s.reviewed_at, s.reviewed_by
    from public.public_idea_suggestions as s
    order by case s.status when 'pending' then 0 when 'approved' then 1 else 2 end,
             s.created_at desc;
end;
$$;

create or replace function public.review_idea_suggestion(p_id bigint, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or (auth.jwt() ->> 'email') is distinct from 'svenkrick@gmx.de' then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'invalid status' using errcode = '22023';
  end if;

  update public.public_idea_suggestions
     set status = p_status,
         reviewed_at = now(),
         reviewed_by = 'svenkrick@gmx.de'
   where id = p_id;

  if not found then
    raise exception 'suggestion not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.get_admin_idea_suggestions() from public, anon, authenticated;
revoke all on function public.review_idea_suggestion(bigint, text) from public, anon, authenticated;
grant execute on function public.get_admin_idea_suggestions() to authenticated;
grant execute on function public.review_idea_suggestion(bigint, text) to authenticated;
