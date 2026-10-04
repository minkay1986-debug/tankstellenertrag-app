-- TankstellenErtrag · Admin-Kundenfeedback
-- RLS bleibt aktiv. Der Admin bekommt nur eine zusätzliche SELECT-Berechtigung
-- auf station_snapshots. Die RPC-Funktion selbst läuft NICHT als SECURITY DEFINER.

create policy "Admin can read customer feedback snapshots"
on public.station_snapshots
for select
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'svenkrick@gmx.de'
);

create or replace function public.get_admin_customer_feedback()
returns jsonb
language sql
security invoker
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
  from public.station_snapshots s;
$$;

revoke execute on function public.get_admin_customer_feedback() from public;
revoke execute on function public.get_admin_customer_feedback() from anon;
grant execute on function public.get_admin_customer_feedback() to authenticated;
