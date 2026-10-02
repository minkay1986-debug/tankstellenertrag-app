-- Customer-facing cancellation status
-- Run this once in the Supabase SQL Editor.
create or replace function public.get_subscription_cancellation_status()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result json;
begin
  if uid is null then
    raise exception 'Nicht angemeldet';
  end if;

  select json_build_object(
    'status', c.status,
    'requested_at', c.requested_at,
    'requested_end_date', c.requested_end_date,
    'subscription_ends_at', s.subscription_ends_at,
    'data_delete_at', s.data_delete_at
  )
  into result
  from public.subscription_cancellations c
  left join public.stations s on s.id = c.station_id
  where c.user_id = uid
  order by c.requested_at desc
  limit 1;

  return coalesce(result, '{}'::json);
end;
$$;

revoke all on function public.get_subscription_cancellation_status() from public;
grant execute on function public.get_subscription_cancellation_status() to authenticated;
