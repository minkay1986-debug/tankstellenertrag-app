-- TankstellenErtrag · automatische Pilotbewerbung bei neuer Registrierung
-- Legt bei jedem neuen Supabase-Auth-Konto automatisch eine Pilotbewerbung an.
-- Die Daten kommen aus auth.users.raw_user_meta_data, die index.html beim signUp setzt.

create or replace function public.handle_new_pilot_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.pilot_applications (
    user_id,
    email,
    full_name,
    station_name,
    postcode,
    city,
    phone,
    status,
    access_type
  )
  select
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'station_name',
    new.raw_user_meta_data ->> 'postcode',
    new.raw_user_meta_data ->> 'city',
    new.raw_user_meta_data ->> 'phone',
    'new',
    'pilot'
  where not exists (
    select 1
    from public.pilot_applications p
    where p.user_id = new.id
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_pilot_application on auth.users;

create trigger on_auth_user_created_pilot_application
after insert on auth.users
for each row
execute procedure public.handle_new_pilot_application();

revoke execute on function public.handle_new_pilot_application() from public;
revoke execute on function public.handle_new_pilot_application() from anon;
revoke execute on function public.handle_new_pilot_application() from authenticated;
