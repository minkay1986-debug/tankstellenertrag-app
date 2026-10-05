-- TankstellenErtrag · Admin-Freischaltung
-- Erstellt/verknüpft beim Freischalten automatisch die Kundenstation.
-- Diese Funktion muss im Supabase-Projekt einmal ausgeführt werden.

create or replace function public.approve_pilot_application(
  p_id uuid,
  p_status text,
  p_access_type text,
  p_access_until timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.pilot_applications%rowtype;
  v_station_id uuid;
  v_subscription_status text;
begin
  -- Zusätzliche serverseitige Admin-Prüfung; die UI/MFA allein reicht nicht.
  if lower(coalesce(auth.jwt() ->> 'email','')) <> 'svenkrick@gmx.de' then
    raise exception 'Keine Administratorberechtigung.';
  end if;

  if p_status not in ('new','reviewed','approved','rejected') then
    raise exception 'Ungültiger Bewerbungsstatus.';
  end if;

  if p_access_type not in ('pilot','founding_partner','paid') then
    raise exception 'Ungültiger Zugangstyp.';
  end if;

  select * into v_app
  from public.pilot_applications
  where id = p_id
  for update;

  if not found then
    raise exception 'Bewerbung nicht gefunden.';
  end if;

  if p_status = 'approved' and p_access_until is null then
    raise exception 'Für eine Freischaltung ist ein Zugangsende erforderlich.';
  end if;

  update public.pilot_applications
  set status = p_status,
      access_type = p_access_type,
      access_until = p_access_until,
      updated_at = now()
  where id = p_id;

  if p_status <> 'approved' then
    return jsonb_build_object('success',true,'station_id',null,'status',p_status);
  end if;

  v_subscription_status := case p_access_type
    when 'pilot' then 'trial'
    when 'founding_partner' then 'founding_partner'
    when 'paid' then 'active'
  end;

  select id into v_station_id
  from public.stations
  where owner_id = v_app.user_id
  limit 1
  for update;

  if v_station_id is null then
    insert into public.stations (
      owner_id,
      station_name,
      postcode,
      city,
      subscription_status,
      trial_ends_at,
      subscription_ends_at,
      founding_partner_free_until
    )
    values (
      v_app.user_id,
      v_app.station_name,
      v_app.postcode,
      v_app.city,
      v_subscription_status,
      case when p_access_type = 'pilot' then p_access_until else null end,
      case when p_access_type = 'paid' then p_access_until else null end,
      case when p_access_type = 'founding_partner' then p_access_until else null end
    )
    returning id into v_station_id;
  else
    update public.stations
    set station_name = v_app.station_name,
        postcode = v_app.postcode,
        city = v_app.city,
        subscription_status = v_subscription_status,
        trial_ends_at = case when p_access_type = 'pilot' then p_access_until else null end,
        subscription_ends_at = case when p_access_type = 'paid' then p_access_until else null end,
        founding_partner_free_until = case when p_access_type = 'founding_partner' then p_access_until else null end
    where id = v_station_id;
  end if;

  return jsonb_build_object(
    'success',true,
    'station_id',v_station_id,
    'status',p_status,
    'subscription_status',v_subscription_status
  );
end;
$$;

revoke all on function public.approve_pilot_application(uuid,text,text,timestamptz) from public;
grant execute on function public.approve_pilot_application(bigint,text,text,timestamptz) to authenticated;
