-- Phase 1 of the advisor learning loop: private, per-user feedback capture.
-- This migration is committed to the isolated test branch only; do not apply to production yet.
create table if not exists public.advisor_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- One user account represents exactly one station.
  station_id uuid not null default auth.uid(),
  question text not null check (char_length(question) between 1 and 1200),
  answer text not null check (char_length(answer) <= 5000),
  rating text not null check (rating in ('helpful','unhelpful')),
  correction text check (correction is null or char_length(correction) <= 1000),
  review_status text not null default 'pending' check (review_status in ('pending','reviewed','rejected','converted_to_knowledge')),
  created_at timestamptz not null default now()
);

create index if not exists advisor_feedback_user_created_idx
  on public.advisor_feedback(user_id, created_at desc);
create index if not exists advisor_feedback_review_idx
  on public.advisor_feedback(review_status, created_at desc);

alter table public.advisor_feedback enable row level security;
revoke all on public.advisor_feedback from anon, authenticated;
grant select, insert, delete on public.advisor_feedback to authenticated;

drop policy if exists advisor_feedback_select_own on public.advisor_feedback;
create policy advisor_feedback_select_own
  on public.advisor_feedback for select to authenticated
  using (user_id = (select auth.uid()) and station_id = (select auth.uid()));

drop policy if exists advisor_feedback_insert_own on public.advisor_feedback;
create policy advisor_feedback_insert_own
  on public.advisor_feedback for insert to authenticated
  with check (user_id = (select auth.uid()) and station_id = (select auth.uid()));

drop policy if exists advisor_feedback_delete_own on public.advisor_feedback;
create policy advisor_feedback_delete_own
  on public.advisor_feedback for delete to authenticated
  using (user_id = (select auth.uid()) and station_id = (select auth.uid()));

-- Isolation: each signed-in station account can access only its own tenant rows.
-- Shared learning must be a separate, reviewed/admin-only workflow; feedback is not
-- automatically promoted to a general rule or injected into model prompts.
