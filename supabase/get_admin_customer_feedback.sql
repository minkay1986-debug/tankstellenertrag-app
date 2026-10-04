-- TankstellenErtrag · Admin-Kundenfeedback
-- Einmalig im Supabase SQL Editor ausführen.
-- Der Zugriff ist ausschließlich für das feste Admin-Konto vorgesehen.

create or replace function public.get_admin_customer_feedback()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'station_id', s.station_id,
        'payload', s.payload,
        'updated_at', s.updated_at
      )
      order by s.updated_at desc
    ),
    '[]'::jsonb
  )
  from public.station_snapshots s
  where lower(coalesce(auth.jwt() ->> 'email', '')) = 'svenkrick@gmx.de';
$$;

revoke execute on function public.get_admin_customer_feedback() from public;
revoke execute on function public.get_admin_customer_feedback() from anon;
grant execute on function public.get_admin_customer_feedback() to authenticated;
