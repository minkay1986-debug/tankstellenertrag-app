-- Reassignment must revoke every old per-station grant to prevent stale cross-company access.
create or replace function public.tse_admin_set_station_company(p_station_id uuid,p_company_id uuid)
returns void language plpgsql security definer set search_path=''
as $$
declare old_company uuid;
begin
  if not private.tse_is_platform_admin() then raise exception 'not_authorized'; end if;
  if p_company_id is not null and not exists(select 1 from public.companies where id=p_company_id) then raise exception 'unknown_company'; end if;
  select company_id into old_company from public.stations where id=p_station_id for update;
  if not found then raise exception 'unknown_station'; end if;
  if old_company is distinct from p_company_id then
    delete from public.station_assignments where station_id=p_station_id;
  end if;
  update public.stations set company_id=p_company_id where id=p_station_id;
end $$;
revoke all on function public.tse_admin_set_station_company(uuid,uuid) from public,anon;
grant execute on function public.tse_admin_set_station_company(uuid,uuid) to authenticated;
