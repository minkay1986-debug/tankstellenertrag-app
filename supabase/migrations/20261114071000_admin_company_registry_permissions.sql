-- Admin-managed company registry and per-station read/write permissions.
alter table public.companies
  add column if not exists company_code text,
  add column if not exists brand text,
  add column if not exists legal_name text;

update public.companies
set company_code='TSE-'||upper(substr(replace(id::text,'-',''),1,12))
where company_code is null or btrim(company_code)='';

alter table public.companies alter column company_code set not null;
create unique index if not exists companies_company_code_uidx on public.companies(company_code);
create unique index if not exists companies_legal_name_uidx on public.companies(lower(legal_name)) where legal_name is not null;

alter table public.station_assignments
  add column if not exists access_level text not null default 'read'
  check (access_level in ('read','write'));

-- A station can only belong to one company. A company admin may edit all its stations.
create or replace function private.tse_is_platform_admin()
returns boolean language sql stable security definer set search_path=''
as $$
  select lower(coalesce(auth.jwt()->>'email',''))='svenkrick@gmx.de';
$$;
revoke all on function private.tse_is_platform_admin() from public, anon;
grant execute on function private.tse_is_platform_admin() to authenticated, service_role;

create or replace function private.tse_can_access_station(p_station_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists (
    select 1 from public.stations s
    where s.id=p_station_id and (
      private.tse_is_platform_admin()
      or s.owner_id=(select auth.uid())
      or exists (
        select 1 from public.company_memberships m
        where m.company_id=s.company_id and m.user_id=(select auth.uid())
          and (
            m.role='company_admin'
            or exists (select 1 from public.station_assignments a
              where a.station_id=s.id and a.user_id=m.user_id)
          )
      )
    )
  );
$$;
create or replace function private.tse_can_write_station(p_station_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists (
    select 1 from public.stations s
    where s.id=p_station_id and (
      private.tse_is_platform_admin()
      or (s.owner_id=(select auth.uid()) and s.company_id is null)
      or exists (
        select 1 from public.company_memberships m
        where m.company_id=s.company_id and m.user_id=(select auth.uid())
          and (
            m.role='company_admin'
            or exists (select 1 from public.station_assignments a
              where a.station_id=s.id and a.user_id=m.user_id and a.access_level='write')
          )
      )
    )
  );
$$;
revoke all on function private.tse_can_access_station(uuid) from public, anon;
revoke all on function private.tse_can_write_station(uuid) from public, anon;
grant execute on function private.tse_can_access_station(uuid),private.tse_can_write_station(uuid) to authenticated, service_role;

-- Replace read/write snapshot policies with differentiated permissions.
drop policy if exists "assigned users write station snapshots" on public.station_snapshots;
drop policy if exists "assigned users update station snapshots" on public.station_snapshots;
create policy "write permitted station snapshots" on public.station_snapshots
for insert to authenticated with check ((select private.tse_can_write_station(station_id)));
create policy "update permitted station snapshots" on public.station_snapshots
for update to authenticated using ((select private.tse_can_write_station(station_id)))
with check ((select private.tse_can_write_station(station_id)));

-- Only the platform admin can inspect the global registry and provision company relationships.
drop policy if exists "platform admin manages companies" on public.companies;
create policy "platform admin manages companies" on public.companies
for all to authenticated using ((select private.tse_is_platform_admin()))
with check ((select private.tse_is_platform_admin()));
drop policy if exists "platform admin manages memberships" on public.company_memberships;
create policy "platform admin manages memberships" on public.company_memberships
for all to authenticated using ((select private.tse_is_platform_admin()))
with check ((select private.tse_is_platform_admin()));
drop policy if exists "platform admin manages assignments" on public.station_assignments;
create policy "platform admin manages assignments" on public.station_assignments
for all to authenticated using ((select private.tse_is_platform_admin()))
with check ((select private.tse_is_platform_admin()));

-- Global registry read is admin-only; company users retain only their own memberships/assignments.
drop policy if exists "company members can read own company" on public.companies;
create policy "company members can read own company" on public.companies
for select to authenticated using (
  (select private.tse_is_platform_admin()) or (select private.tse_is_company_member(id))
);
drop policy if exists "members can read company memberships" on public.company_memberships;
create policy "members can read company memberships" on public.company_memberships
for select to authenticated using (
  (select private.tse_is_platform_admin()) or (select private.tse_is_company_member(company_id))
);
drop policy if exists "members can read station assignments" on public.station_assignments;
create policy "members can read station assignments" on public.station_assignments
for select to authenticated using (
  (select private.tse_is_platform_admin()) or (select private.tse_can_access_station(station_id))
);

-- Platform-admin RPC: safe, bounded overview of users, firms and stations.
create or replace function public.tse_admin_overview()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare out_json jsonb;
begin
  if not private.tse_is_platform_admin() then raise exception 'not_authorized'; end if;
  select jsonb_build_object(
    'companies',(select coalesce(jsonb_agg(to_jsonb(c) order by c.name),'[]'::jsonb) from public.companies c),
    'stations',(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'station_name',s.station_name,'city',s.city,'company_id',s.company_id,'owner_id',s.owner_id) order by s.station_name),'[]'::jsonb) from public.stations s),
    'memberships',(select coalesce(jsonb_agg(to_jsonb(m)),'[]'::jsonb) from public.company_memberships m),
    'assignments',(select coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) from public.station_assignments a),
    'users',(select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'email',u.email,'created_at',u.created_at) order by u.email),'[]'::jsonb) from auth.users u where u.deleted_at is null)
  ) into out_json;
  return out_json;
end $$;
revoke all on function public.tse_admin_overview() from public,anon;
grant execute on function public.tse_admin_overview() to authenticated;

create or replace function public.tse_admin_create_company(p_name text,p_legal_name text,p_brand text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare new_id uuid; new_code text;
begin
  if not private.tse_is_platform_admin() then raise exception 'not_authorized'; end if;
  if length(btrim(coalesce(p_name,'')))<2 or length(btrim(coalesce(p_legal_name,'')))<2 then raise exception 'name_required'; end if;
  if exists(select 1 from public.companies c where lower(c.legal_name)=lower(btrim(p_legal_name))) then raise exception 'company_already_exists'; end if;
  new_code:='TSE-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
  insert into public.companies(name,legal_name,brand,company_code)
  values(btrim(p_name),btrim(p_legal_name),nullif(btrim(p_brand),''),new_code)
  returning id into new_id;
  return jsonb_build_object('id',new_id,'company_code',new_code);
end $$;
revoke all on function public.tse_admin_create_company(text,text,text) from public,anon;
grant execute on function public.tse_admin_create_company(text,text,text) to authenticated;

create or replace function public.tse_admin_set_station_company(p_station_id uuid,p_company_id uuid)
returns void language plpgsql security definer set search_path=''
as $$
begin
  if not private.tse_is_platform_admin() then raise exception 'not_authorized'; end if;
  if p_company_id is not null and not exists(select 1 from public.companies where id=p_company_id) then raise exception 'unknown_company'; end if;
  update public.stations set company_id=p_company_id where id=p_station_id;
  if not found then raise exception 'unknown_station'; end if;
end $$;
revoke all on function public.tse_admin_set_station_company(uuid,uuid) from public,anon;
grant execute on function public.tse_admin_set_station_company(uuid,uuid) to authenticated;

create or replace function public.tse_admin_set_membership(p_company_id uuid,p_user_id uuid,p_role text)
returns void language plpgsql security definer set search_path=''
as $$
begin
  if not private.tse_is_platform_admin() then raise exception 'not_authorized'; end if;
  if p_role not in ('company_admin','regional_manager','station_manager') then raise exception 'invalid_role'; end if;
  if not exists(select 1 from public.companies where id=p_company_id) or not exists(select 1 from auth.users where id=p_user_id and deleted_at is null) then raise exception 'unknown_company_or_user'; end if;
  insert into public.company_memberships(company_id,user_id,role) values(p_company_id,p_user_id,p_role)
  on conflict(company_id,user_id) do update set role=excluded.role;
end $$;
revoke all on function public.tse_admin_set_membership(uuid,uuid,text) from public,anon;
grant execute on function public.tse_admin_set_membership(uuid,uuid,text) to authenticated;

create or replace function public.tse_admin_set_station_access(p_station_id uuid,p_user_id uuid,p_access text)
returns void language plpgsql security definer set search_path=''
as $$
declare co uuid;
begin
  if not private.tse_is_platform_admin() then raise exception 'not_authorized'; end if;
  if p_access not in ('read','write','none') then raise exception 'invalid_access'; end if;
  select company_id into co from public.stations where id=p_station_id;
  if not found then raise exception 'unknown_station'; end if;
  if p_access='none' then
    delete from public.station_assignments where station_id=p_station_id and user_id=p_user_id;
  else
    if co is null then raise exception 'station_needs_company_assignment_first'; end if;
    if not exists(select 1 from public.company_memberships where company_id=co and user_id=p_user_id) then raise exception 'user_not_company_member'; end if;
    insert into public.station_assignments(station_id,user_id,assigned_by,access_level)
    values(p_station_id,p_user_id,(select auth.uid()),p_access)
    on conflict(station_id,user_id) do update set access_level=excluded.access_level,assigned_by=excluded.assigned_by;
  end if;
end $$;
revoke all on function public.tse_admin_set_station_access(uuid,uuid,text) from public,anon;
grant execute on function public.tse_admin_set_station_access(uuid,uuid,text) to authenticated;
