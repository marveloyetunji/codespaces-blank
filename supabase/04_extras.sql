-- Community counts for the resident home screen. Run last.
-- Returns totals only, so no private data is exposed.

create or replace function public.community_stats()
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'reports',   (select count(*) from reports where status <> 'cancelled'),
    'collected', (select count(*) from reports where status = 'collected'),
    'residents', (select count(*) from profiles where role = 'citizen')
  );
$$;
grant execute on function public.community_stats() to authenticated;

-- Nearby Map for residents. Returns only type, status, date and rounded
-- coordinates (about 100 m), never photos, names or addresses.
create or replace function public.nearby_reports(
  p_lat double precision, p_lng double precision, p_km numeric default 2)
returns table (
  waste_type text, status text,
  lat double precision, lng double precision,
  created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select r.waste_type, r.status,
         round(r.lat::numeric, 3)::double precision,
         round(r.lng::numeric, 3)::double precision,
         r.created_at
  from public.reports r
  where r.status not in ('rejected','cancelled')
    and 6371000 * 2 * asin(least(1.0, sqrt(
          power(sin(radians(r.lat - p_lat) / 2), 2) +
          cos(radians(p_lat)) * cos(radians(r.lat)) *
          power(sin(radians(r.lng - p_lng) / 2), 2)
        ))) <= least(p_km, 10) * 1000
  order by r.created_at desc
  limit 300;
$$;
revoke execute on function public.nearby_reports(double precision, double precision, numeric) from public, anon;
grant execute on function public.nearby_reports(double precision, double precision, numeric) to authenticated;
