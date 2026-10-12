-- Weather learning observations for the Ertragsoptimierer.
-- Branch-only migration: do not apply to production until reviewed and wired to real daily data.
-- One row represents one station, one calendar day, and one product group.
create table if not exists public.station_weather_observations (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  observation_date date not null,
  group_key text not null check (length(trim(group_key)) between 1 and 120),
  actual_revenue numeric(14,2) not null check (actual_revenue >= 0),
  max_temp_c numeric(5,2),
  min_temp_c numeric(5,2),
  precipitation_mm numeric(7,2),
  is_open boolean not null default true,
  is_complete boolean not null default false,
  promotion boolean not null default false,
  revenue_source text not null default 'manual'
    check (revenue_source in ('manual', 'pos_import', 'huth_import')),
  weather_source text not null default 'dwd'
    check (weather_source in ('dwd', 'open_meteo', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint station_weather_observations_temp_range
    check (
      (max_temp_c is null or max_temp_c between -80 and 65)
      and (min_temp_c is null or min_temp_c between -80 and 65)
      and (max_temp_c is null or min_temp_c is null or min_temp_c <= max_temp_c)
    ),
  constraint station_weather_observations_precip_nonnegative
    check (precipitation_mm is null or precipitation_mm >= 0),
  constraint station_weather_observations_unique_day_group
    unique (station_id, observation_date, group_key)
);

create index if not exists station_weather_observations_station_date_idx
  on public.station_weather_observations (station_id, observation_date desc);
create index if not exists station_weather_observations_group_date_idx
  on public.station_weather_observations (station_id, group_key, observation_date desc);

alter table public.station_weather_observations enable row level security;

-- Customers can access only their own station's observations while their account is entitled.
drop policy if exists "weather observations owner access" on public.station_weather_observations;
create policy "weather observations owner access"
  on public.station_weather_observations
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.stations s
      where s.id = station_weather_observations.station_id
        and s.owner_id = auth.uid()
        and (
          s.subscription_status = 'active'
          or (s.subscription_status = 'trial' and s.trial_ends_at > now())
          or (s.subscription_status = 'founding_partner' and s.founding_partner_free_until > now())
        )
    )
  )
  with check (
    exists (
      select 1
      from public.stations s
      where s.id = station_weather_observations.station_id
        and s.owner_id = auth.uid()
        and (
          s.subscription_status = 'active'
          or (s.subscription_status = 'trial' and s.trial_ends_at > now())
          or (s.subscription_status = 'founding_partner' and s.founding_partner_free_until > now())
        )
    )
  );

grant select, insert, update, delete on public.station_weather_observations to authenticated;

comment on table public.station_weather_observations is
  'Daily station/product-group actual revenue paired with observed weather for transparent, non-causal learning. Not populated automatically until a reviewed ingestion path exists.';
comment on column public.station_weather_observations.is_complete is
  'Only true when daily revenue is complete and usable for analysis.';
comment on column public.station_weather_observations.promotion is
  'Promotion days are excluded from baseline weather comparisons.';
