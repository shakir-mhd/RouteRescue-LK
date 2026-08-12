-- =====================================================================
-- ROUTERESCUE LK - SUPABASE DATABASE SCHEMA SETUP
-- INCLUDES POSTGIS GEOSPATIAL PROXIMITY CALCULATIONS & TIER MATCHING
-- =====================================================================

-- 1. Enable PostGIS Extension (Required for geography data types & distance checks)
create extension if not exists postgis;

-- 2. Create Profiles Table (Shared details for drivers & mechanics)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  phone text,
  role text not null check (role in ('driver', 'mechanic')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Mechanics Table (Extends Profile for Registered Responders)
create table public.mechanics (
  id uuid references public.profiles(id) on delete cascade primary key,
  business_name text not null,
  nic text not null unique,
  tier text not null check (tier in ('basic', 'premium')),
  is_available boolean default true not null,
  location geography(Point, 4326) not null, -- Stores GPS coordinates (lat, lng)
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Create Incidents Table (Emergency requests submitted by Drivers)
create table public.incidents (
  id uuid default gen_random_uuid() primary key,
  driver_id uuid references public.profiles(id) on delete set null,
  category text not null check (category in ('Smoke/Overheating', 'Flat Tire', 'Electrical/Won''t Start', 'Completely Stalled')),
  status text default 'Request Sent' not null check (status in ('Request Sent', 'Mechanic En Route', 'On-Site Repair', 'Resolved', 'Cancelled')),
  base_tariff numeric not null,
  location geography(Point, 4326) not null, -- Incident coordinates
  assigned_mechanic_id uuid references public.mechanics(id) on delete set null,
  cancellation_reason text,
  cancelled_by text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Build Spatial Indexes (CRITICAL: speeds up proximity search queries)
create index on public.mechanics using gist(location);
create index on public.incidents using gist(location);

-- 6. Core Function: Proximity Tier-Matching Algorithm
-- Finds the closest available mechanic within their subscription radius limits (Basic <= 5km, Premium Pro <= 25km)
create or replace function public.match_nearest_mechanic(
  p_driver_latitude double precision,
  p_driver_longitude double precision
)
returns table (
  mechanic_id uuid,
  mechanic_name text,
  business_name text,
  tier text,
  distance_km double precision
)
language plpgsql
security definer
as $$
declare
  v_driver_loc geography(Point, 4326);
begin
  -- Construct geography point from inputs
  v_driver_loc := st_setsrid(st_makepoint(p_driver_longitude, p_driver_latitude), 4326)::geography;

  return query
  select
    m.id as mechanic_id,
    p.name as mechanic_name,
    m.business_name,
    m.tier,
    st_distance(m.location, v_driver_loc) / 1000.0 as distance_km
  from public.mechanics m
  join public.profiles p on p.id = m.id
  where m.is_available = true
    and (
      -- Basic Tier Mechanics: 5km (5000 meters) operational limit
      (m.tier = 'basic' and st_dwithin(m.location, v_driver_loc, 5000))
      or
      -- Premium Pro Mechanics: 25km (25000 meters) priority operational limit
      (m.tier = 'premium' and st_dwithin(m.location, v_driver_loc, 25000))
    )
  -- Return nearest responders first
  order by distance_km asc
  limit 1;
end;
$$;

-- 7. Configure Row Level Security (RLS) policies
alter table public.profiles enable row level security;
alter table public.mechanics enable row level security;
alter table public.incidents enable row level security;

-- Profile Policies
create policy "Users can read all profiles" on public.profiles
  for select using (true);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- Mechanic Policies
create policy "Anyone can view active mechanics on map" on public.mechanics
  for select using (true);

create policy "Mechanics can manage their own profile details" on public.mechanics
  for all using (auth.uid() = id);

-- Incident Policies
create policy "Drivers can view their own incidents" on public.incidents
  for select using (auth.uid() = driver_id);

create policy "Mechanics can view incidents assigned to them" on public.incidents
  for select using (auth.uid() = assigned_mechanic_id);

create policy "Drivers can report new incidents" on public.incidents
  for insert with check (auth.uid() = driver_id);

create policy "Assigned mechanics or driver can update incident state" on public.incidents
  for update using (auth.uid() = driver_id or auth.uid() = assigned_mechanic_id);

-- 8. Create Subscription Plans Table (Dynamic Admin Subscription Tiers)
create table if not exists public.subscription_plans (
  id text primary key,
  name text not null unique,
  price numeric not null,
  radius numeric not null,
  max_capacity numeric default 3,
  features text[] default '{}',
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 9. Create Admin Settings Table (System Tariff & Passcode Config)
create table if not exists public.admin_settings (
  id integer primary key default 1,
  passcode text not null default '2004',
  flat_rate numeric not null default 1000,
  per_km_rate numeric not null default 200,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Configure RLS for Subscription Plans & Admin Settings
alter table public.subscription_plans enable row level security;
alter table public.admin_settings enable row level security;

create policy "Anyone can read subscription plans" on public.subscription_plans for select using (true);
create policy "Anyone can manage subscription plans" on public.subscription_plans for all using (true);

create policy "Anyone can read admin settings" on public.admin_settings for select using (true);
create policy "Anyone can manage admin settings" on public.admin_settings for all using (true);
