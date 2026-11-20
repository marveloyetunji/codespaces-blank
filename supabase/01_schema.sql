-- EcoTrack database schema. Run first.
-- Tables, row level security, storage and realtime.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  phone text,
  role text not null default 'citizen'
    check (role in ('citizen','collector','admin')),
  created_at timestamptz not null default now()
);
alter table public.profiles drop constraint if exists profiles_phone_check;
alter table public.profiles add constraint profiles_phone_check
  check (phone is null or phone ~ '^\+[0-9]{8,15}$');

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  photo_url text,
  proof_url text,
  lat double precision not null,
  lng double precision not null,
  address text,
  waste_type text not null,
  quantity text check (char_length(quantity) <= 40),
  description text,
  status text not null default 'pending',
  priority text not null default 'normal',
  assigned_to uuid references public.profiles(id) on delete set null,
  rating smallint check (rating between 1 and 5),
  rejection_reason text,
  cancel_reason text,
  preferred_date date,
  preferred_slot text check (preferred_slot in ('morning','afternoon','evening')),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  assigned_at timestamptz,
  started_at timestamptz,
  collected_at timestamptz
);
alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports add constraint reports_status_check
  check (status in ('pending','approved','assigned','in_progress','collected','rejected','cancelled'));

create index if not exists reports_user_idx on public.reports (user_id);
create index if not exists reports_assigned_idx on public.reports (assigned_to);
create index if not exists reports_status_idx on public.reports (status);

-- role lookup (security definer avoids recursive policies)
create or replace function public.get_my_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- every new sign-up becomes a citizen
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role, phone)
  values (new.id, new.raw_user_meta_data->>'name', 'citizen',
          nullif(new.raw_user_meta_data->>'phone', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- row level security
alter table public.profiles enable row level security;
alter table public.reports  enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "admin read all profiles" on public.profiles;
create policy "admin read all profiles" on public.profiles
  for select using (public.get_my_role() = 'admin');

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = public.get_my_role());

drop policy if exists "admin update profiles" on public.profiles;
create policy "admin update profiles" on public.profiles
  for update using (public.get_my_role() = 'admin');

drop policy if exists "citizen insert own report" on public.reports;
create policy "citizen insert own report" on public.reports
  for insert with check (user_id = auth.uid());

drop policy if exists "citizen read own reports" on public.reports;
create policy "citizen read own reports" on public.reports
  for select using (user_id = auth.uid());

drop policy if exists "collector read assigned" on public.reports;
create policy "collector read assigned" on public.reports
  for select using (assigned_to = auth.uid());

drop policy if exists "collector update assigned" on public.reports;
create policy "collector update assigned" on public.reports
  for update using (assigned_to = auth.uid())
  with check (assigned_to = auth.uid());

drop policy if exists "admin all reports" on public.reports;
create policy "admin all reports" on public.reports
  for all using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- realtime
do $$
begin
  alter publication supabase_realtime add table public.reports;
exception when duplicate_object then null;
end $$;

-- photo storage
insert into storage.buckets (id, name, public)
values ('waste-photos', 'waste-photos', true)
on conflict (id) do nothing;

drop policy if exists "public read photos" on storage.objects;
create policy "public read photos" on storage.objects
  for select using (bucket_id = 'waste-photos');

drop policy if exists "upload own photos" on storage.objects;
create policy "upload own photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'waste-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "delete own photos" on storage.objects;
create policy "delete own photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'waste-photos' and (storage.foldername(name))[1] = auth.uid()::text);
