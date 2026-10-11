-- TankstellenErtrag Betreiber-Community (prepared migration; NOT applied to production yet)
-- Private to authenticated users. No station snapshots, turnover or margin data is exposed.
create table if not exists public.community_posts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  category text not null check (category in ('Einkauf & Marge','Warengruppen','Schwund & Bestand','Wetter & Absatz','Personal & Alltag','Technik & HUTH','Aktionen & Kunden','Allgemein')),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  status text not null default 'published' check (status in ('published','hidden','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists community_posts_feed_idx
  on public.community_posts (status, category, created_at desc);

create table if not exists public.community_replies (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  status text not null default 'published' check (status in ('published','hidden','removed')),
  created_at timestamptz not null default now()
);
create index if not exists community_replies_post_idx
  on public.community_replies (post_id, created_at asc);

create table if not exists public.community_reports (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.community_posts(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 1 and 1000),
  status text not null default 'new' check (status in ('new','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);
create index if not exists community_reports_review_idx
  on public.community_reports (status, created_at desc);

alter table public.community_posts enable row level security;
alter table public.community_replies enable row level security;
alter table public.community_reports enable row level security;

revoke all on public.community_posts from anon;
revoke all on public.community_replies from anon;
revoke all on public.community_reports from anon;
grant select, insert, update on public.community_posts to authenticated;
grant select, insert on public.community_replies to authenticated;
grant insert on public.community_reports to authenticated;
grant usage, select on sequence public.community_posts_id_seq to authenticated;
grant usage, select on sequence public.community_replies_id_seq to authenticated;
grant usage, select on sequence public.community_reports_id_seq to authenticated;

drop policy if exists community_posts_read_published on public.community_posts;
create policy community_posts_read_published on public.community_posts
  for select to authenticated using (status = 'published' or user_id = (select auth.uid()));
drop policy if exists community_posts_insert_own on public.community_posts;
create policy community_posts_insert_own on public.community_posts
  for insert to authenticated with check (user_id = (select auth.uid()) and status = 'published');
drop policy if exists community_posts_update_own on public.community_posts;
create policy community_posts_update_own on public.community_posts
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and status in ('published','hidden'));

drop policy if exists community_replies_read_published on public.community_replies;
create policy community_replies_read_published on public.community_replies
  for select to authenticated using (
    status = 'published' and exists (
      select 1 from public.community_posts p where p.id = post_id and p.status = 'published'
    )
    or user_id = (select auth.uid())
  );
drop policy if exists community_replies_insert_own on public.community_replies;
create policy community_replies_insert_own on public.community_replies
  for insert to authenticated with check (
    user_id = (select auth.uid()) and status = 'published' and exists (
      select 1 from public.community_posts p where p.id = post_id and p.status = 'published'
    )
  );

drop policy if exists community_reports_insert_own on public.community_reports;
create policy community_reports_insert_own on public.community_reports
  for insert to authenticated with check (
    reporter_id = (select auth.uid()) and exists (
      select 1 from public.community_posts p where p.id = post_id and p.status = 'published'
    )
  );
-- Reports intentionally have no authenticated SELECT/UPDATE policy: members cannot see or alter reports.
