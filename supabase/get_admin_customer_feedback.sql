-- TankstellenErtrag · Admin-Kundenfeedback
-- Feedback lesen und einzelne Einträge löschen.
-- RLS bleibt aktiv; Admin-Zugriff erfolgt über die eigene Admin-Policy.

create policy "Admin can read customer feedback snapshots"
on public.station_snapshots
for select
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'svenkrick@gmx.de'
);

create policy "Admin can update customer feedback snapshots"
on public.station_snapshots
for update
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'svenkrick@gmx.de'
)
with check (
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

create or replace function public.delete_admin_customer_feedback(
  p_station_id uuid,
  p_feedback_id text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  changed integer;
begin
  update public.station_snapshots
  set payload = jsonb_set(
    payload,
    '{feedback}',
    coalesce(
      (
        select jsonb_agg(item)
        from jsonb_array_elements(coalesce(payload->'feedback','[]'::jsonb)) as item
        where item->>'id' <> p_feedback_id
      ),
      '[]'::jsonb
    ),
    true
  ),
  updated_at = now()
  where station_id = p_station_id
    and lower(coalesce(auth.jwt() ->> 'email', '')) = 'svenkrick@gmx.de'
    and jsonb_typeof(payload->'feedback') = 'array'
    and exists (
      select 1
      from jsonb_array_elements(payload->'feedback') as item
      where item->>'id' = p_feedback_id
    );

  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

revoke execute on function public.get_admin_customer_feedback() from public;
revoke execute on function public.get_admin_customer_feedback() from anon;
grant execute on function public.get_admin_customer_feedback() to authenticated;

revoke execute on function public.delete_admin_customer_feedback(uuid,text) from public;
revoke execute on function public.delete_admin_customer_feedback(uuid,text) from anon;
grant execute on function public.delete_admin_customer_feedback(uuid,text) to authenticated;
