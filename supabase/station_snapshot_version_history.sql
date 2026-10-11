-- Tankstellenertrag: version history and per-month recovery for station snapshots.
-- Applied to Supabase on 2026-10-11. Additive migration; does not overwrite current snapshots.
create table if not exists public.station_snapshot_history (
  id bigint generated always as identity primary key,
  station_id uuid not null references public.stations(id) on delete cascade,
  schema_version integer not null,
  app_version text,
  payload jsonb not null,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  archived_at timestamptz not null default now(),
  archive_reason text not null default 'before_update'
);

create index if not exists station_snapshot_history_lookup_idx
  on public.station_snapshot_history (station_id, archived_at desc);

alter table public.station_snapshot_history enable row level security;
revoke all on public.station_snapshot_history from anon, authenticated;

create or replace function public.archive_station_snapshot_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.payload is distinct from new.payload
     or old.schema_version is distinct from new.schema_version
     or old.app_version is distinct from new.app_version then
    insert into public.station_snapshot_history
      (station_id, schema_version, app_version, payload, source_created_at, source_updated_at, archive_reason)
    values
      (old.station_id, old.schema_version, old.app_version, old.payload, old.created_at, old.updated_at, 'before_update');
  end if;
  return new;
end;
$$;

drop trigger if exists station_snapshot_history_before_update on public.station_snapshots;
create trigger station_snapshot_history_before_update
before update on public.station_snapshots
for each row execute function public.archive_station_snapshot_before_update();

-- Seed a baseline for each existing snapshot (idempotent).
insert into public.station_snapshot_history
  (station_id, schema_version, app_version, payload, source_created_at, source_updated_at, archive_reason)
select s.station_id, s.schema_version, s.app_version, s.payload, s.created_at, s.updated_at, 'initial_baseline'
from public.station_snapshots s
where not exists (
  select 1 from public.station_snapshot_history h
  where h.station_id = s.station_id
);

create or replace function public.get_admin_snapshot_history(p_station_id uuid, p_limit integer default 50)
returns table (
  history_id bigint,
  station_id uuid,
  app_version text,
  schema_version integer,
  archived_at timestamptz,
  archive_reason text,
  available_months text[]
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(coalesce(auth.jwt() ->> 'email', '')) <> 'svenkrick@gmx.de' then
    raise exception 'Nicht autorisiert.';
  end if;

  return query
  select h.id, h.station_id, h.app_version, h.schema_version, h.archived_at, h.archive_reason,
    coalesce(array(select jsonb_object_keys(h.payload->'months')), array[]::text[])
  from public.station_snapshot_history h
  where h.station_id = p_station_id
  order by h.archived_at desc, h.id desc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
end;
$$;

create or replace function public.restore_admin_snapshot_month(p_history_id bigint, p_month text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  archived public.station_snapshot_history%rowtype;
  changed integer;
begin
  if lower(coalesce(auth.jwt() ->> 'email', '')) <> 'svenkrick@gmx.de' then
    raise exception 'Nicht autorisiert.';
  end if;
  if p_month is null or p_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
    raise exception 'Ungültiger Monats-Schlüssel.';
  end if;

  select * into archived
  from public.station_snapshot_history
  where id = p_history_id;

  if not found then
    raise exception 'Sicherung nicht gefunden.';
  end if;
  if jsonb_typeof(archived.payload->'months') <> 'object'
     or not ((archived.payload->'months') ? p_month) then
    raise exception 'Der Monat ist in dieser Sicherung nicht vorhanden.';
  end if;

  update public.station_snapshots current_snapshot
  set payload = jsonb_set(current_snapshot.payload, array['months', p_month], archived.payload->'months'->p_month, true),
      updated_at = now()
  where current_snapshot.station_id = archived.station_id;

  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

revoke execute on function public.get_admin_snapshot_history(uuid, integer) from public, anon;
revoke execute on function public.restore_admin_snapshot_month(bigint, text) from public, anon;
grant execute on function public.get_admin_snapshot_history(uuid, integer) to authenticated;
grant execute on function public.restore_admin_snapshot_month(bigint, text) to authenticated;
