-- Company / role management hardening for isolated Security-Test project.
-- Scope: platform admin + company-admin scoped member and station assignments.
-- This migration is NOT deployed to the live Supabase project.

-- Remove direct anonymous access to company and station administration tables.
REVOKE ALL PRIVILEGES ON TABLE public.companies, public.company_memberships, public.station_assignments, public.stations FROM anon;

-- Company admins may manage only their own company memberships and cannot create,
-- edit, or demote existing company-admin memberships. Platform admins remain unrestricted.
CREATE OR REPLACE FUNCTION public.tse_admin_set_membership(p_company_id uuid, p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare is_platform_admin boolean; is_company_admin boolean;
begin
  is_platform_admin := private.tse_is_platform_admin();
  is_company_admin := private.tse_can_manage_company(p_company_id);

  if not is_platform_admin and not is_company_admin then
    raise exception 'not_authorized';
  end if;

  if p_role not in ('company_admin','regional_manager','station_manager') then
    raise exception 'invalid_role';
  end if;

  if not exists(select 1 from public.companies where id=p_company_id)
     or not exists(select 1 from auth.users where id=p_user_id and deleted_at is null) then
    raise exception 'unknown_company_or_user';
  end if;

  if not is_platform_admin and p_role='company_admin' then
    raise exception 'company_admin_role_requires_platform_admin';
  end if;

  if not is_platform_admin and exists (
    select 1 from public.company_memberships
    where company_id=p_company_id and user_id=p_user_id and role='company_admin'
  ) then
    raise exception 'cannot_modify_company_admin_membership';
  end if;

  insert into public.company_memberships(company_id,user_id,role)
  values(p_company_id,p_user_id,p_role)
  on conflict(company_id,user_id) do update set role=excluded.role;
end
$function$;

-- Company admins may assign/remove read/write access only to stations in their company
-- and only to users who are already members of that company.
CREATE OR REPLACE FUNCTION public.tse_admin_set_station_access(p_station_id uuid, p_user_id uuid, p_access text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare co uuid; is_platform_admin boolean; is_company_admin boolean;
begin
  is_platform_admin := private.tse_is_platform_admin();

  if p_access not in ('read','write','none') then
    raise exception 'invalid_access';
  end if;

  select company_id into co from public.stations where id=p_station_id;
  if not found then raise exception 'unknown_station'; end if;

  is_company_admin := private.tse_can_manage_company(co);
  if not is_platform_admin and not is_company_admin then
    raise exception 'not_authorized';
  end if;

  if p_access='none' then
    delete from public.station_assignments where station_id=p_station_id and user_id=p_user_id;
  else
    if co is null then raise exception 'station_needs_company_assignment_first'; end if;
    if not exists(select 1 from public.company_memberships where company_id=co and user_id=p_user_id) then
      raise exception 'user_not_company_member';
    end if;
    insert into public.station_assignments(station_id,user_id,assigned_by,access_level)
    values(p_station_id,p_user_id,(select auth.uid()),p_access)
    on conflict(station_id,user_id) do update set access_level=excluded.access_level,assigned_by=excluded.assigned_by;
  end if;
end
$function$;

-- Remove a company membership and its station assignments. Company admins may
-- remove only non-admin members from their own company.
CREATE OR REPLACE FUNCTION public.tse_admin_remove_membership(p_company_id uuid,p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare is_platform_admin boolean; is_company_admin boolean;
begin
  is_platform_admin := private.tse_is_platform_admin();
  is_company_admin := private.tse_can_manage_company(p_company_id);
  if not is_platform_admin and not is_company_admin then raise exception 'not_authorized'; end if;
  if not exists(select 1 from public.company_memberships where company_id=p_company_id and user_id=p_user_id) then
    raise exception 'membership_not_found';
  end if;
  if not is_platform_admin and exists (
    select 1 from public.company_memberships where company_id=p_company_id and user_id=p_user_id and role='company_admin'
  ) then raise exception 'company_admin_membership_requires_platform_admin'; end if;
  delete from public.company_memberships where company_id=p_company_id and user_id=p_user_id;
  delete from public.station_assignments a
  where a.user_id=p_user_id and a.station_id in (select s.id from public.stations s where s.company_id=p_company_id);
end
$function$;

-- Explicitly limit RPC execution to signed-in roles.
REVOKE ALL ON FUNCTION public.tse_admin_remove_membership(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tse_admin_remove_membership(uuid,uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.tse_admin_create_company(text,text,text), public.tse_admin_overview(), public.tse_admin_set_membership(uuid,uuid,text), public.tse_admin_set_station_access(uuid,uuid,text), public.tse_admin_set_station_company(uuid,uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.tse_admin_create_company(text,text,text), public.tse_admin_overview(), public.tse_admin_set_membership(uuid,uuid,text), public.tse_admin_set_station_access(uuid,uuid,text), public.tse_admin_set_station_company(uuid,uuid) TO authenticated, service_role;
