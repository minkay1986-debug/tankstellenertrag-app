-- Minimize personal data in technical application error reports.
-- Keep authentication required, but do not retain account IDs or email addresses.
begin;

update public.app_error_reports
set user_id = null,
    user_email = null
where user_id is not null or user_email is not null;

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

  -- Prevent accidental retention of email addresses or complete URLs in error text.
  safe_message := regexp_replace(safe_message, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+[.][A-Za-z]{2,}', '[E-Mail]', 'gi');
  safe_message := regexp_replace(safe_message, 'https?://[^[:space:]]+', '[URL]', 'gi');

  safe_meta := case when jsonb_typeof(p_metadata)='object' then p_metadata else '{}'::jsonb end;
  safe_meta := safe_meta - 'token' - 'access_token' - 'refresh_token' - 'password' - 'authorization' - 'body' - 'url';
  safe_meta := jsonb_build_object(
    'path', left(coalesce(safe_meta->>'path',''), 180),
    'online', coalesce((safe_meta->>'online')::boolean, true),
    'appVersion', left(coalesce(safe_meta->>'appVersion',''), 40)
  );

  -- Fingerprint is technical only; it no longer includes an account identifier.
  fp := md5(safe_source || '|' || safe_type || '|' || safe_message || '|' || coalesce(p_http_status::text,''));
  select id into existing_id
  from public.app_error_reports
  where fingerprint=fp and status <> 'resolved' and last_seen > now()-interval '15 minutes'
  order by last_seen desc limit 1;

  if existing_id is not null then
    update public.app_error_reports
    set occurrences=least(occurrences+1,100000), last_seen=now(), metadata=safe_meta,
        user_id=null, user_email=null
    where id=existing_id;
    return jsonb_build_object('ok',true,'deduplicated',true);
  end if;

  insert into public.app_error_reports(
    fingerprint,user_id,user_email,source,error_type,message,http_status,metadata
  ) values (
    fp,null,null,safe_source,safe_type,safe_message,
    case when p_http_status between 100 and 599 then p_http_status else null end,safe_meta
  );
  return jsonb_build_object('ok',true,'deduplicated',false);
end;
$$;

revoke execute on function public.report_app_error(text,text,text,integer,jsonb) from public, anon;
grant execute on function public.report_app_error(text,text,text,integer,jsonb) to authenticated;

commit;
