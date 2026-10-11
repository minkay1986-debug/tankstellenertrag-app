-- TankstellenErtrag Betreiber-Community
-- Separate content tables; never reference station or monthly-data tables.
begin;

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 140),
  body text not null check (char_length(trim(body)) between 3 and 5000),
  topic text not null default 'sonstiges'
    check (topic in ('warenwirtschaft','marge','personal','technik','sonstiges')),
  is_anonymous boolean not null default false,
  status text not null default 'published'
    check (status in ('published','hidden','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2500),
  is_anonymous boolean not null default false,
  status text not null default 'published'
    check (status in ('published','hidden','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 3 and 1000),
  status text not null default 'new'
    check (status in ('new','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists community_posts_published_created_idx
  on public.community_posts(status, created_at desc);
create index if not exists community_posts_author_created_idx
  on public.community_posts(author_id, created_at desc);
create index if not exists community_replies_post_created_idx
  on public.community_replies(post_id, created_at asc);
create index if not exists community_replies_author_created_idx
  on public.community_replies(author_id, created_at desc);
create index if not exists community_reports_status_created_idx
  on public.community_reports(status, created_at desc);

alter table public.community_posts enable row level security;
alter table public.community_replies enable row level security;
alter table public.community_reports enable row level security;

drop policy if exists community_posts_read_published on public.community_posts;
create policy community_posts_read_published
  on public.community_posts for select to authenticated
  using (status = 'published' or author_id = auth.uid());

drop policy if exists community_posts_insert_own on public.community_posts;
create policy community_posts_insert_own
  on public.community_posts for insert to authenticated
  with check (author_id = auth.uid() and status = 'published');

drop policy if exists community_posts_update_own on public.community_posts;
create policy community_posts_update_own
  on public.community_posts for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists community_posts_delete_own on public.community_posts;
create policy community_posts_delete_own
  on public.community_posts for delete to authenticated
  using (author_id = auth.uid());

drop policy if exists community_replies_read_published on public.community_replies;
create policy community_replies_read_published
  on public.community_replies for select to authenticated
  using (
    (status = 'published' and exists (
      select 1 from public.community_posts p
      where p.id = community_replies.post_id and p.status = 'published'
    ))
    or author_id = auth.uid()
  );

drop policy if exists community_replies_insert_own on public.community_replies;
create policy community_replies_insert_own
  on public.community_replies for insert to authenticated
  with check (
    author_id = auth.uid()
    and status = 'published'
    and exists (
      select 1 from public.community_posts p
      where p.id = community_replies.post_id and p.status = 'published'
    )
  );

drop policy if exists community_replies_update_own on public.community_replies;
create policy community_replies_update_own
  on public.community_replies for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists community_replies_delete_own on public.community_replies;
create policy community_replies_delete_own
  on public.community_replies for delete to authenticated
  using (author_id = auth.uid());

drop policy if exists community_reports_insert_own on public.community_reports;
create policy community_reports_insert_own
  on public.community_reports for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and exists (
      select 1 from public.community_posts p
      where p.id = community_reports.post_id and p.status = 'published'
    )
  );

-- Reports are intentionally not readable or editable by ordinary clients.
revoke all on public.community_posts from anon;
revoke all on public.community_replies from anon;
revoke all on public.community_reports from anon;
grant select, insert, update, delete on public.community_posts to authenticated;
grant select, insert, update, delete on public.community_replies to authenticated;
grant insert on public.community_reports to authenticated;

commit;
