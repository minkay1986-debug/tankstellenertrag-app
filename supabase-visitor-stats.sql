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
