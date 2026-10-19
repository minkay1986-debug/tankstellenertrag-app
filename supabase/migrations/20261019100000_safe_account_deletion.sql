-- Account deletion pre-cleanup.
-- Deletes customer-linked application data atomically while preserving due station
-- rows as retry markers until the Auth user has been deleted successfully.
create or replace function public.delete_customer_data_before_auth(
  p_owner_id uuid,
  p_station_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_station_count integer;
  v_snapshots integer := 0;
  v_history integer := 0;
  v_pilot integer := 0;
  v_errors integer := 0;
  v_cancellations integer := 0;
begin
  if p_owner_id is null or p_station_ids is null or cardinality(p_station_ids) = 0 then
    raise exception 'owner and station ids are required';
  end if;

  -- Only allow cleanup of the complete supplied set of stations owned by this user,
  -- and only after every supplied station's deletion date has elapsed.
  select count(*)
    into v_station_count
    from public.stations s
   where s.id = any(p_station_ids)
     and s.owner_id = p_owner_id
     and s.data_delete_at is not null
     and s.data_delete_at <= now();

  if v_station_count <> cardinality(p_station_ids) then
    raise exception 'station ownership or deletion deadline validation failed';
  end if;

  delete from public.station_snapshots
   where station_id = any(p_station_ids);
  get diagnostics v_snapshots = row_count;

  delete from public.station_snapshot_history
   where station_id = any(p_station_ids);
  get diagnostics v_history = row_count;

  delete from public.pilot_applications
   where user_id = p_owner_id;
  get diagnostics v_pilot = row_count;

  delete from public.app_error_reports
   where user_id = p_owner_id;
  get diagnostics v_errors = row_count;

  delete from public.subscription_cancellations
   where user_id = p_owner_id
      or station_id = any(p_station_ids);
  get diagnostics v_cancellations = row_count;

  return jsonb_build_object(
    'ok', true,
    'deleted', jsonb_build_object(
      'station_snapshots', v_snapshots,
      'station_snapshot_history', v_history,
      'pilot_applications', v_pilot,
      'app_error_reports', v_errors,
      'subscription_cancellations', v_cancellations
    )
  );
end;
$$;

revoke all on function public.delete_customer_data_before_auth(uuid, uuid[]) from public;
revoke all on function public.delete_customer_data_before_auth(uuid, uuid[]) from anon;
revoke all on function public.delete_customer_data_before_auth(uuid, uuid[]) from authenticated;
grant execute on function public.delete_customer_data_before_auth(uuid, uuid[]) to service_role;
