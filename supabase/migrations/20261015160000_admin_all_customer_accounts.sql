-- Admin account management RPCs. Admin identity is checked in every function.
create or replace function public.get_admin_customer_accounts()
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
begin
  if lower(coalesce(auth.jwt()->>'email','')) <> 'svenkrick@gmx.de' then
    raise exception 'Keine Administratorberechtigung.';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.created_at desc nulls last)
    from (
      select
        u.id as user_id,
        u.email,
        coalesce(a.full_name, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name') as full_name,
        coalesce(a.station_name, s.station_name) as station_name,
        coalesce(a.postcode, s.postcode) as postcode,
        coalesce(a.city, s.city) as city,
        a.phone,
        a.id as application_id,
        coalesce(a.status, case when s.id is not null then 'approved' else 'new' end) as status,
        coalesce(a.access_type, case when s.subscription_status='founding_partner' then 'founding_partner' when s.subscription_status='active' then 'paid' else 'pilot' end) as access_type,
        a.access_until,
        s.id as station_uuid,
        s.station_id,
        s.subscription_status,
        s.trial_ends_at,
        s.subscription_ends_at,
        s.founding_partner_free_until,
        coalesce(s.created_at, a.created_at, u.created_at) as created_at,
        coalesce(s.is_suspended, false) as is_suspended,
        s.suspension_reason
      from auth.users u
      left join public.pilot_applications a on a.user_id=u.id
      left join public.stations s on s.owner_id=u.id
      where lower(coalesce(u.email,'')) <> 'svenkrick@gmx.de'
        and (a.id is not null or s.id is not null)
    ) x
  ), '[]'::jsonb);
end;
$function$;

revoke all on function public.get_admin_customer_accounts() from public, anon;
grant execute on function public.get_admin_customer_accounts() to authenticated;

create or replace function public.set_customer_suspension_by_user(
  p_user_id uuid,
  p_suspended boolean,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_station_id text;
begin
  if lower(coalesce(auth.jwt()->>'email','')) <> 'svenkrick@gmx.de' then
    raise exception 'Keine Administratorberechtigung.';
  end if;

  if p_user_id is null or p_suspended is null then
    raise exception 'Kundenkonto oder Sperrstatus fehlt.';
  end if;

  select station_id into v_station_id
  from public.stations
  where owner_id = p_user_id
  limit 1
  for update;

  if v_station_id is null then
    raise exception 'Keine verknüpfte Station gefunden.';
  end if;

  update public.stations
  set is_suspended = p_suspended,
      suspension_reason = case when p_suspended then nullif(trim(coalesce(p_reason,'')),'') else null end,
      updated_at = now()
  where owner_id = p_user_id;

  return jsonb_build_object(
    'success', true,
    'suspended', p_suspended,
    'station_id', v_station_id
  );
end;
$function$;

revoke all on function public.set_customer_suspension_by_user(uuid, boolean, text) from public, anon;
grant execute on function public.set_customer_suspension_by_user(uuid, boolean, text) to authenticated;

create or replace function public.delete_customer_account_by_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_email text;
  v_station_count integer;
begin
  if lower(coalesce(auth.jwt()->>'email','')) <> 'svenkrick@gmx.de' then
    raise exception 'Keine Administratorberechtigung.';
  end if;

  if p_user_id is null then
    raise exception 'Kundenkonto fehlt.';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Das eigene Administratorkonto kann hier nicht gelöscht werden.';
  end if;

  select email into v_email
  from auth.users
  where id = p_user_id
  for update;

  if v_email is null then
    raise exception 'Kundenkonto nicht gefunden.';
  end if;

  if lower(v_email) = 'svenkrick@gmx.de' then
    raise exception 'Das Administratorkonto kann nicht gelöscht werden.';
  end if;

  select count(*) into v_station_count
  from public.stations where owner_id = p_user_id;

  delete from auth.users where id = p_user_id;

  if not found then
    raise exception 'Kundenkonto konnte nicht gelöscht werden.';
  end if;

  return jsonb_build_object('success', true, 'deleted_user_id', p_user_id, 'stations_removed', v_station_count);
end;
$function$;

revoke all on function public.delete_customer_account_by_user(uuid) from public, anon;
grant execute on function public.delete_customer_account_by_user(uuid) to authenticated;
