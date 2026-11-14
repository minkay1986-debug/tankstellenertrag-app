-- Multi-station company roles: company admin, regional manager and station manager.
-- All authorization is enforced by PostgreSQL RLS. Membership/assignment writes
-- are intentionally not exposed to authenticated clients; provisioning is server-side.

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 160),
  created_at timestamptz not null default now()
);

create table if not exists public.company_memberships (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('company_admin','regional_manager','station_manager')),
  created_at timestamptz not null default now(),
  primary key (company_id,user_id)
);

create table if not exists public.station_assignments (
  station_id uuid not null references public.stations(id) on delete cascade,
  user_id uuid not null,
  assigned_by uuid,
  created_at timestamptz not null default now(),
  primary key (station_id,user_id)
);

alter table public.stations add column if not exists company_id uuid;
do $$
begin
  if not exists (select 1 from pg_constraint where conname='stations_company_id_fkey' and conrelid='public.stations'::regclass) then
    alter table public.stations add constraint stations_company_id_fkey
      foreign key (company_id) references public.companies(id) on delete set null;
  end if;
end $$;

create index if not exists company_memberships_user_company_idx on public.company_memberships(user_id,company_id);
create index if not exists station_assignments_user_station_idx on public.station_assignments(user_id,station_id);
create index if not exists stations_company_id_idx on public.stations(company_id);

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.tse_is_company_member(p_company_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists (
    select 1 from public.company_memberships m
    where m.company_id=p_company_id and m.user_id=(select auth.uid())
  );
$$;

create or replace function private.tse_can_access_station(p_station_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists (
    select 1 from public.stations s
    where s.id=p_station_id and (
      s.owner_id=(select auth.uid())
      or exists (
        select 1 from public.company_memberships m
        where m.company_id=s.company_id and m.user_id=(select auth.uid())
          and (
            m.role='company_admin'
            or exists (
              select 1 from public.station_assignments a
              where a.station_id=s.id and a.user_id=m.user_id
            )
          )
      )
    )
  );
$$;

create or replace function private.tse_can_manage_company(p_company_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists (
    select 1 from public.company_memberships m
    where m.company_id=p_company_id and m.user_id=(select auth.uid())
      and m.role='company_admin'
  );
$$;

revoke all on function private.tse_is_company_member(uuid) from public, anon;
revoke all on function private.tse_can_access_station(uuid) from public, anon;
revoke all on function private.tse_can_manage_company(uuid) from public, anon;
grant execute on function private.tse_is_company_member(uuid) to authenticated, service_role;
grant execute on function private.tse_can_access_station(uuid) to authenticated, service_role;
grant execute on function private.tse_can_manage_company(uuid) to authenticated, service_role;

alter table public.companies enable row level security;
alter table public.company_memberships enable row level security;
alter table public.station_assignments enable row level security;

drop policy if exists "company members can read own company" on public.companies;
create policy "company members can read own company" on public.companies
for select to authenticated using ((select private.tse_is_company_member(id)));

drop policy if exists "members can read company memberships" on public.company_memberships;
create policy "members can read company memberships" on public.company_memberships
for select to authenticated using ((select private.tse_is_company_member(company_id)));

drop policy if exists "members can read station assignments" on public.station_assignments;
create policy "members can read station assignments" on public.station_assignments
for select to authenticated using ((select private.tse_can_access_station(station_id)));

drop policy if exists "users read owned or assigned stations" on public.stations;
create policy "users read owned or assigned stations" on public.stations
for select to authenticated using (
  owner_id=(select auth.uid()) or (select private.tse_can_access_station(id))
);

drop policy if exists "owners or company admins create stations" on public.stations;
create policy "owners or company admins create stations" on public.stations
for insert to authenticated with check (
  (owner_id=(select auth.uid()) and company_id is null)
  or (company_id is not null and (select private.tse_can_manage_company(company_id)))
);

drop policy if exists "owners or company admins update stations" on public.stations;
create policy "owners or company admins update stations" on public.stations
for update to authenticated
using (
  (owner_id=(select auth.uid()) and company_id is null)
  or (company_id is not null and (select private.tse_can_manage_company(company_id)))
)
with check (
  (owner_id=(select auth.uid()) and company_id is null)
  or (company_id is not null and (select private.tse_can_manage_company(company_id)))
);

drop policy if exists "owners or company admins delete stations" on public.stations;
create policy "owners or company admins delete stations" on public.stations
for delete to authenticated using (
  (owner_id=(select auth.uid()) and company_id is null)
  or (company_id is not null and (select private.tse_can_manage_company(company_id)))
);

drop policy if exists "assigned users read station snapshots" on public.station_snapshots;
create policy "assigned users read station snapshots" on public.station_snapshots
for select to authenticated using ((select private.tse_can_access_station(station_id)));

drop policy if exists "assigned users write station snapshots" on public.station_snapshots;
create policy "assigned users write station snapshots" on public.station_snapshots
for insert to authenticated with check ((select private.tse_can_access_station(station_id)));

drop policy if exists "assigned users update station snapshots" on public.station_snapshots;
create policy "assigned users update station snapshots" on public.station_snapshots
for update to authenticated
using ((select private.tse_can_access_station(station_id)))
with check ((select private.tse_can_access_station(station_id)));

drop policy if exists "assigned users read station snapshot history" on public.station_snapshot_history;
create policy "assigned users read station snapshot history" on public.station_snapshot_history
for select to authenticated using ((select private.tse_can_access_station(station_id)));

grant select on public.companies,public.company_memberships,public.station_assignments to authenticated;
grant select,insert,update,delete on public.stations to authenticated;
grant select,insert,update on public.station_snapshots to authenticated;
grant select on public.station_snapshot_history to authenticated;
