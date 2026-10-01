-- TankstellenErtrag: einfache, datensparsame Besucherstatistik
create table if not exists public.site_visits (
  id bigint generated always as identity primary key,
  visitor_id text not null,
  visited_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (visitor_id, visited_on)
);

alter table public.site_visits enable row level security;

revoke all on table public.site_visits from anon, authenticated;

create or replace function public.track_public_visit(p_visitor_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_visitor_id is null or length(trim(p_visitor_id)) < 10 or length(trim(p_visitor_id)) > 100 then
    return;
  end if;

  insert into public.site_visits(visitor_id, visited_on)
  values (trim(p_visitor_id), current_date)
  on conflict (visitor_id, visited_on) do nothing;
end;
$$;

revoke all on function public.track_public_visit(text) from public;
grant execute on function public.track_public_visit(text) to anon, authenticated;

create or replace function public.get_visitor_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
begin
  is_admin := lower(coalesce(auth.jwt() ->> 'email','')) = 'svenkrick@gmx.de';

  if not is_admin then
    raise exception 'Nicht autorisiert';
  end if;

  return json_build_object(
    'today', (select count(*) from public.site_visits where visited_on = current_date),
    'last7', (select count(*) from public.site_visits where visited_on >= current_date - 6),
    'month', (select count(*) from public.site_visits where visited_on >= date_trunc('month', current_date)::date),
    'applications', (select count(*) from public.pilot_applications where lower(email) <> 'svenkrick@gmx.de')
  );
end;
$$;

revoke all on function public.get_visitor_stats() from public;
grant execute on function public.get_visitor_stats() to authenticated;


-- Öffentliche Pilotplatz-Anzeige: zählt echte, nicht abgelehnte Pilotbewerbungen.
create or replace function public.get_pilot_slots()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  used_slots integer;
begin
  used_slots := (select count(*)::integer from public.pilot_applications
                 where lower(coalesce(email,'')) <> 'svenkrick@gmx.de'
                   and coalesce(status,'new') <> 'rejected');

  return json_build_object(
    'total', 10,
    'used', used_slots,
    'remaining', greatest(0, 10 - used_slots)
  );
end;
$$;

revoke all on function public.get_pilot_slots() from public;
grant execute on function public.get_pilot_slots() to anon, authenticated;

-- Kündigungsanfragen: Kunde stellt die Kündigung selbst, Admin bestätigt/terminiert sie.
create table if not exists public.subscription_cancellations (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  station_id uuid null references public.stations(id) on delete set null,
  requested_at timestamptz not null default now(),
  requested_end_date date null,
  status text not null default 'requested' check (status in ('requested','confirmed','cancelled')),
  processed_at timestamptz null,
  note text null
);
alter table public.subscription_cancellations enable row level security;
revoke all on table public.subscription_cancellations from anon, authenticated;

create or replace function public.request_subscription_cancellation()
returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); sid uuid;
begin
 if uid is null then raise exception 'Nicht angemeldet'; end if;
 select id into sid from public.stations where owner_id=uid order by created_at desc nulls last limit 1;
 if exists(select 1 from public.subscription_cancellations where user_id=uid and status='requested') then
   return json_build_object('ok',true,'message','Eine Kündigungsanfrage liegt bereits vor.');
 end if;
 insert into public.subscription_cancellations(user_id,station_id) values(uid,sid);
 return json_build_object('ok',true,'message','Kündigungsanfrage wurde übermittelt.');
end; $$;
revoke all on function public.request_subscription_cancellation() from public;
grant execute on function public.request_subscription_cancellation() to authenticated;

create or replace function public.get_cancellation_requests()
returns json language plpgsql security definer set search_path=public as $$
begin
 if lower(coalesce(auth.jwt()->>'email','')) <> 'svenkrick@gmx.de' then raise exception 'Nicht autorisiert'; end if;
 return coalesce((select json_agg(x order by requested_at desc) from (
   select c.id,c.user_id,c.station_id,c.requested_at,c.requested_end_date,c.status,c.processed_at,c.note,u.email,s.station_name
   from public.subscription_cancellations c left join auth.users u on u.id=c.user_id
   left join public.stations s on s.id=c.station_id where c.status='requested'
 ) x),'[]'::json);
end; $$;
revoke all on function public.get_cancellation_requests() from public;
grant execute on function public.get_cancellation_requests() to authenticated;

create or replace function public.confirm_subscription_cancellation(p_id bigint,p_end_date date,p_note text default null)
returns json language plpgsql security definer set search_path=public as $$
declare c public.subscription_cancellations;
begin
 if lower(coalesce(auth.jwt()->>'email','')) <> 'svenkrick@gmx.de' then raise exception 'Nicht autorisiert'; end if;
 select * into c from public.subscription_cancellations where id=p_id and status='requested';
 if c.id is null then raise exception 'Kündigungsanfrage nicht gefunden'; end if;
 update public.subscription_cancellations set status='confirmed',requested_end_date=p_end_date,processed_at=now(),note=p_note where id=p_id;
 if c.station_id is not null then update public.stations set subscription_ends_at=(p_end_date + time '23:59:59') where id=c.station_id; end if;
 return json_build_object('ok',true,'end_date',p_end_date);
end; $$;
revoke all on function public.confirm_subscription_cancellation(bigint,date,text) from public;
grant execute on function public.confirm_subscription_cancellation(bigint,date,text) to authenticated;


-- Rechtssicherer Lösch-Lifecycle für Kundenkonten.
-- Vertragsende und Löschdatum werden getrennt geführt.
alter table public.stations
  add column if not exists cancellation_requested_at timestamptz null,
  add column if not exists data_delete_at timestamptz null;

create index if not exists stations_data_delete_at_idx
  on public.stations(data_delete_at)
  where data_delete_at is not null;

create or replace function public.confirm_subscription_cancellation(
  p_id bigint,
  p_end_date date,
  p_note text default null
)
returns json
language plpgsql
security definer
set search_path=public
as $$
declare
  c public.subscription_cancellations;
  delete_at timestamptz;
begin
  if lower(coalesce(auth.jwt()->>'email','')) <> 'svenkrick@gmx.de' then
    raise exception 'Nicht autorisiert';
  end if;

  if p_end_date is null then
    raise exception 'Enddatum fehlt';
  end if;

  select * into c
  from public.subscription_cancellations
  where id=p_id and status='requested';

  if c.id is null then
    raise exception 'Kündigungsanfrage nicht gefunden';
  end if;

  delete_at := ((p_end_date + 30) + time '23:59:59');

  update public.subscription_cancellations
     set status='confirmed',
         requested_end_date=p_end_date,
         processed_at=now(),
         note=p_note
   where id=p_id;

  if c.station_id is not null then
    update public.stations
       set subscription_ends_at=(p_end_date + time '23:59:59'),
           cancellation_requested_at=coalesce(c.requested_at,now()),
           data_delete_at=delete_at
     where id=c.station_id;
  end if;

  return json_build_object(
    'ok',true,
    'end_date',p_end_date,
    'data_delete_at',delete_at,
    'delete_after_days',30
  );
end;
$$;

revoke all on function public.confirm_subscription_cancellation(bigint,date,text) from public;
grant execute on function public.confirm_subscription_cancellation(bigint,date,text) to authenticated;

-- Manuelle Löschvormerkung durch den Admin.
-- Es wird bewusst nur ein Löschtermin gesetzt; die eigentliche Auth-Löschung
-- muss serverseitig mit privilegiertem Supabase-Zugriff erfolgen.
create or replace function public.schedule_customer_deletion(
  p_user_id uuid,
  p_delete_at timestamptz default now()
)
returns json
language plpgsql
security definer
set search_path=public
as $$
declare
  affected integer;
begin
  if lower(coalesce(auth.jwt()->>'email','')) <> 'svenkrick@gmx.de' then
    raise exception 'Nicht autorisiert';
  end if;

  if p_user_id is null then
    raise exception 'Kunden-ID fehlt';
  end if;

  update public.stations
     set data_delete_at=coalesce(p_delete_at,now())
   where owner_id=p_user_id;

  get diagnostics affected = row_count;

  return json_build_object(
    'ok',true,
    'user_id',p_user_id,
    'data_delete_at',coalesce(p_delete_at,now()),
    'stations_updated',affected
  );
end;
$$;

revoke all on function public.schedule_customer_deletion(uuid,timestamptz) from public;
grant execute on function public.schedule_customer_deletion(uuid,timestamptz) to authenticated;

-- Liefert dem Admin die anstehenden Löschungen, ohne den Kunden selbst freizugeben.
create or replace function public.get_pending_account_deletions()
returns json
language plpgsql
security definer
set search_path=public
as $$
begin
  if lower(coalesce(auth.jwt()->>'email','')) <> 'svenkrick@gmx.de' then
    raise exception 'Nicht autorisiert';
  end if;

  return coalesce((
    select json_agg(x order by x.data_delete_at asc)
    from (
      select s.owner_id,
             s.id as station_id,
             s.station_name,
             s.data_delete_at,
             u.email
      from public.stations s
      left join auth.users u on u.id=s.owner_id
      where s.data_delete_at is not null
    ) x
  ),'[]'::json);
end;
$$;

revoke all on function public.get_pending_account_deletions() from public;
grant execute on function public.get_pending_account_deletions() to authenticated;
