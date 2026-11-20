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
