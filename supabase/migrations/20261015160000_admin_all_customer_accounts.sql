-- Show all customer accounts in the admin area, including stations without a pilot application.
create or replace function public.get_admin_customer_accounts()
returns table (
  user_id uuid,
  application_id uuid,
  email text,
  full_name text,
  station_name text,
  postcode text,
  city text,
  phone text,
  status text,
  access_type text,
  access_until timestamptz,
  created_at timestamptz,
  station_id text,
  subscription_status text,
  trial_ends_at timestamptz,
  subscription_ends_at timestamptz,
  founding_partner_free_until timestamptz,
  is_suspended boolean,
  suspension_reason text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if lower(coalesce(auth.jwt() ->> 'email','')) <> 'svenkrick@gmx.de' then
    raise exception 'Keine Administratorberechtigung.';
  end if;

  return query
  select
    u.id,
    a.id,
    coalesce(a.email, u.email)::text,
    coalesce(a.full_name, u.raw_user_meta_data ->> 'full_name', '')::text,
    coalesce(a.station_name, s.station_name, u.raw_user_meta_data ->> 'station_name', '')::text,
    coalesce(a.postcode, s.postcode, u.raw_user_meta_data ->> 'postcode', '')::text,
    coalesce(a.city, s.city, u.raw_user_meta_data ->> 'city', '')::text,
    coalesce(a.phone, u.raw_user_meta_data ->> 'phone', '')::text,
    coalesce(a.status, case when s.owner_id is not null then 'approved' else 'new' end)::text,
    coalesce(a.access_type,
      case s.subscription_status
        when 'trial' then 'pilot'
        when 'founding_partner' then 'founding_partner'
        when 'active' then 'paid'
        else 'pilot'
      end)::text,
    coalesce(a.access_until, s.founding_partner_free_until, s.subscription_ends_at, s.trial_ends_at),
    coalesce(a.created_at, u.created_at),
    s.station_id::text,
    s.subscription_status::text,
    s.trial_ends_at,
    s.subscription_ends_at,
    s.founding_partner_free_until,
    coalesce(s.is_suspended, false),
    s.suspension_reason::text
  from auth.users u
  left join public.pilot_applications a on a.user_id = u.id
  left join lateral (
    select st.*
    from public.stations st
    where st.owner_id = u.id
    order by st.created_at nulls last
    limit 1
  ) s on true
  where lower(coalesce(u.email,'')) <> 'svenkrick@gmx.de'
    and (a.id is not null or s.owner_id is not null)
  order by coalesce(a.created_at, u.created_at) desc;
end;
$$;

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
as $$
declare
  v_station_id text;
begin
  if lower(coalesce(auth.jwt() ->> 'email','')) <> 'svenkrick@gmx.de' then
    raise exception 'Keine Administratorberechtigung.';
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

  return jsonb_build_object('success', true, 'suspended', p_suspended, 'station_id', v_station_id);
end;
$$;

revoke all on function public.set_customer_suspension_by_user(uuid, boolean, text) from public, anon;
grant execute on function public.set_customer_suspension_by_user(uuid, boolean, text) to authenticated;

create or replace function public.delete_customer_account_by_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if lower(coalesce(auth.jwt() ->> 'email','')) <> 'svenkrick@gmx.de' then
    raise exception 'Keine Administratorberechtigung.';
  end if;

  select email into v_email from auth.users where id = p_user_id for update;
  if v_email is null then
    raise exception 'Kundenkonto nicht gefunden.';
  end if;

  delete from public.stations where owner_id = p_user_id;
  delete from public.pilot_applications where user_id = p_user_id;
  delete from auth.users where id = p_user_id;

  return jsonb_build_object('success', true, 'email', v_email);
end;
$$;

revoke all on function public.delete_customer_account_by_user(uuid) from public, anon;
grant execute on function public.delete_customer_account_by_user(uuid) to authenticated;
