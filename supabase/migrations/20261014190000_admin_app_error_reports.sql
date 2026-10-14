create table if not exists public.app_error_reports (
  id bigint generated always as identity primary key,
  fingerprint text not null,
  user_id uuid,
  user_email text,
  source text not null,
  error_type text not null,
  message text not null,
  http_status integer,
  metadata jsonb not null default '{}'::jsonb,
  occurrences integer not null default 1,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  status text not null default 'open' check (status in ('open','monitoring','resolved'))
);
create index if not exists app_error_reports_last_seen_idx on public.app_error_reports(last_seen desc);
create index if not exists app_error_reports_fingerprint_idx on public.app_error_reports(fingerprint, last_seen desc);
alter table public.app_error_reports enable row level security;
revoke all on public.app_error_reports from anon, authenticated;
grant select, insert, update on public.app_error_reports to service_role;

create or replace function public.report_app_error(
  p_source text,
  p_error_type text,
  p_message text,
  p_http_status integer default null,
  p_metadata jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_email text := lower(coalesce(auth.jwt() ->> 'email',''));
  safe_source text := left(regexp_replace(coalesce(p_source,'unknown'), '[^a-zA-Z0-9_.:/-]', '', 'g'), 100);
  safe_type text := left(regexp_replace(coalesce(p_error_type,'Error'), '[^a-zA-Z0-9_. -]', '', 'g'), 100);
  safe_message text := left(regexp_replace(coalesce(p_message,'Unbekannter Fehler'), '[[:cntrl:]]', ' ', 'g'), 700);
  safe_meta jsonb;
  fp text;
  existing_id bigint;
begin
  if caller_id is null then raise exception 'Authentifizierung erforderlich.'; end if;
  if safe_source = '' then safe_source := 'unknown'; end if;
  if safe_type = '' then safe_type := 'Error'; end if;
  if safe_message = '' then safe_message := 'Unbekannter Fehler'; end if;
  safe_meta := case when jsonb_typeof(p_metadata)='object' then p_metadata else '{}'::jsonb end;
  -- Keine Tokens, Request-Bodies, Passwörter oder vollständigen URLs übernehmen.
  safe_meta := safe_meta - 'token' - 'access_token' - 'refresh_token' - 'password' - 'authorization' - 'body' - 'url';
  safe_meta := jsonb_build_object(
    'path', left(coalesce(safe_meta->>'path',''), 180),
    'online', coalesce((safe_meta->>'online')::boolean, true),
    'appVersion', left(coalesce(safe_meta->>'appVersion',''), 40)
  );
  fp := md5(caller_id::text || '|' || safe_source || '|' || safe_type || '|' || safe_message || '|' || coalesce(p_http_status::text,''));
  select id into existing_id from public.app_error_reports
    where fingerprint=fp and status <> 'resolved' and last_seen > now()-interval '15 minutes'
    order by last_seen desc limit 1;
  if existing_id is not null then
    update public.app_error_reports set occurrences=least(occurrences+1,100000),last_seen=now(),metadata=safe_meta
      where id=existing_id;
    return jsonb_build_object('ok',true,'deduplicated',true);
  end if;
  insert into public.app_error_reports(fingerprint,user_id,user_email,source,error_type,message,http_status,metadata)
    values(fp,caller_id,left(caller_email,254),safe_source,safe_type,safe_message,
      case when p_http_status between 100 and 599 then p_http_status else null end,safe_meta);
  return jsonb_build_object('ok',true,'deduplicated',false);
end;
$$;

create or replace function public.get_admin_app_error_reports(p_limit integer default 100)
returns setof public.app_error_reports
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(coalesce(auth.jwt()->>'email','')) <> 'svenkrick@gmx.de' then
    raise exception 'Nicht autorisiert.';
  end if;
  return query select * from public.app_error_reports
    order by case status when 'open' then 0 when 'monitoring' then 1 else 2 end, last_seen desc
    limit greatest(1,least(coalesce(p_limit,100),300));
end;
$$;

create or replace function public.set_admin_app_error_status(p_id bigint,p_status text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(coalesce(auth.jwt()->>'email','')) <> 'svenkrick@gmx.de' then
    raise exception 'Nicht autorisiert.';
  end if;
  if p_status not in ('open','monitoring','resolved') then raise exception 'Ungültiger Status.'; end if;
  update public.app_error_reports set status=p_status where id=p_id;
  return found;
end;
$$;

revoke execute on function public.report_app_error(text,text,text,integer,jsonb) from public, anon;
grant execute on function public.report_app_error(text,text,text,integer,jsonb) to authenticated;
revoke execute on function public.get_admin_app_error_reports(integer) from public, anon;
grant execute on function public.get_admin_app_error_reports(integer) to authenticated;
revoke execute on function public.set_admin_app_error_status(bigint,text) from public, anon;
grant execute on function public.set_admin_app_error_status(bigint,text) to authenticated;
