-- Stored notifications, created by the database. Run third.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  report_id uuid references public.reports(id) on delete cascade,
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx
  on public.notifications (user_id, read, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "read own notifications" on public.notifications;
create policy "read own notifications" on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists "mark own notifications read" on public.notifications;
create policy "mark own notifications read" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- the app can only mark notifications read, never create or edit them
revoke update on public.notifications from authenticated;
grant update (read) on public.notifications to authenticated;

create or replace function public.notify_report_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lbl text := coalesce(new.waste_type, 'Waste') || coalesce(' at ' || nullif(new.address, ''), '');
begin
  if tg_op = 'INSERT' then
    insert into notifications (user_id, report_id, title, body)
      values (new.user_id, new.id, 'Report received', 'We have received your report. ' || lbl);
    insert into notifications (user_id, report_id, title, body)
      select id, new.id, 'New report submitted', lbl from profiles where role = 'admin';
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'approved' then
      insert into notifications (user_id, report_id, title, body)
        values (new.user_id, new.id, 'Report approved', lbl);
    elsif new.status = 'rejected' then
      insert into notifications (user_id, report_id, title, body)
        values (new.user_id, new.id, 'Report rejected', 'Reason: ' || coalesce(new.rejection_reason, 'not given'));
    elsif new.status = 'assigned' then
      insert into notifications (user_id, report_id, title, body)
        values (new.assigned_to, new.id, 'New job assigned', lbl);
      insert into notifications (user_id, report_id, title, body)
        values (new.user_id, new.id, 'Collector assigned', lbl);
    elsif new.status = 'in_progress' then
      insert into notifications (user_id, report_id, title, body)
        values (new.user_id, new.id, 'Being attended to', 'A collector has started on your report. ' || lbl);
      insert into notifications (user_id, report_id, title, body)
        select id, new.id, 'Collection started', lbl from profiles where role = 'admin';
    elsif new.status = 'collected' then
      insert into notifications (user_id, report_id, title, body)
        values (new.user_id, new.id, 'Collection completed', 'Please rate the service. ' || lbl);
      insert into notifications (user_id, report_id, title, body)
        select id, new.id, 'Job collected', lbl from profiles where role = 'admin';
    end if;
  elsif new.assigned_to is distinct from old.assigned_to
        and new.assigned_to is not null and new.status = 'assigned' then
    insert into notifications (user_id, report_id, title, body)
      values (new.assigned_to, new.id, 'New job assigned', lbl);
  end if;

  if new.rating is distinct from old.rating and new.rating is not null then
    insert into notifications (user_id, report_id, title, body)
      select id, new.id, 'Feedback received', new.rating || ' of 5 stars for ' || lbl
      from profiles where role = 'admin';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify on public.reports;
create trigger trg_notify
  after insert or update on public.reports
  for each row execute function public.notify_report_change();

create or replace function public.notify_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    insert into notifications (user_id, report_id, title, body)
      select id, new.id, 'Report cancelled',
             coalesce(new.waste_type, 'Waste') || ': ' || coalesce(new.cancel_reason, 'no reason given')
      from profiles where role = 'admin';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_cancel on public.reports;
create trigger trg_notify_cancel
  after update on public.reports
  for each row execute function public.notify_cancelled();

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;
