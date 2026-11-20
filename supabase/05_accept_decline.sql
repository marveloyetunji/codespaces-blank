-- Collector Accept and Decline. Run fifth, after 01 to 04.
-- Replaces the earlier versions of set_status_times, enforce_report_rules
-- and notify_report_change. No new status is added.

alter table public.reports add column if not exists accepted_at timestamptz;
alter table public.reports add column if not exists declined_at timestamptz;
alter table public.reports add column if not exists decline_reason text;
alter table public.reports add column if not exists declined_by uuid references public.profiles(id) on delete set null;

-- timestamps, and a new assignment clears any earlier acceptance
create or replace function public.set_status_times()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'approved' then new.approved_at = now();
    elsif new.status = 'rejected' then new.rejected_at = now();
    elsif new.status = 'cancelled' then new.cancelled_at = now();
    elsif new.status = 'assigned' then new.assigned_at = now();
    elsif new.status = 'in_progress' then new.started_at = now();
    elsif new.status = 'collected' then new.collected_at = now();
    end if;
  end if;
  if new.status = 'assigned'
     and (old.status is distinct from 'assigned' or new.assigned_to is distinct from old.assigned_to) then
    new.accepted_at := null;
  end if;
  return new;
end;
$$;

-- status rules, now with Accept and Decline
create or replace function public.enforce_report_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  r text;
begin
  if uid is null then return new; end if;
  select role into r from public.profiles where id = uid;

  if r = 'admin' then
    if new.status is distinct from old.status then
      if not (
           (old.status = 'pending'     and new.status in ('approved','rejected'))
        or (old.status = 'approved'    and new.status in ('assigned','rejected'))
        or (old.status = 'assigned'    and new.status in ('approved','in_progress'))
        or (old.status = 'in_progress' and new.status = 'collected')
      ) then
        raise exception 'Invalid status change: % to %', old.status, new.status;
      end if;
      if new.status = 'assigned' and new.assigned_to is null then
        raise exception 'Choose a collector first';
      end if;
      if new.status = 'rejected' and coalesce(trim(new.rejection_reason), '') = '' then
        raise exception 'A rejection reason is required';
      end if;
    end if;
    return new;
  end if;

  -- a collector declining a job assigned to them
  if r = 'collector' and old.assigned_to = uid and old.status = 'assigned'
     and new.status = 'approved' and new.assigned_to is null then
    if coalesce(trim(new.decline_reason), '') = '' then
      raise exception 'Please give a reason for declining';
    end if;
    if new.user_id is distinct from old.user_id
       or new.lat is distinct from old.lat
       or new.lng is distinct from old.lng
       or new.priority is distinct from old.priority
       or new.rejection_reason is distinct from old.rejection_reason
       or new.cancel_reason is distinct from old.cancel_reason
       or new.rating is distinct from old.rating
       or new.proof_url is distinct from old.proof_url then
      raise exception 'You cannot change these fields';
    end if;
    return new;
  end if;

  if new.user_id is distinct from old.user_id
     or new.lat is distinct from old.lat
     or new.lng is distinct from old.lng
     or new.priority is distinct from old.priority
     or new.assigned_to is distinct from old.assigned_to
     or new.rejection_reason is distinct from old.rejection_reason
     or new.declined_by is distinct from old.declined_by
     or new.declined_at is distinct from old.declined_at
     or new.decline_reason is distinct from old.decline_reason then
    raise exception 'You cannot change these fields';
  end if;

  if r = 'collector' then
    if new.rating is distinct from old.rating
       or new.cancel_reason is distinct from old.cancel_reason then
      raise exception 'Collectors cannot change this';
    end if;
    if new.status is distinct from old.status then
      if old.assigned_to is distinct from uid then
        raise exception 'This job is not assigned to you';
      end if;
      if not (  (old.status = 'assigned'    and new.status = 'in_progress')
             or (old.status = 'in_progress' and new.status = 'collected')) then
        raise exception 'Invalid status change: % to %', old.status, new.status;
      end if;
      if new.status = 'in_progress' and new.accepted_at is null then
        raise exception 'Accept the job before starting it';
      end if;
      if new.status = 'collected' and new.proof_url is null then
        raise exception 'A proof photo is required';
      end if;
    end if;
  else
    if new.status is distinct from old.status then
      if not (old.user_id = uid and old.status in ('pending','approved') and new.status = 'cancelled') then
        raise exception 'You can only cancel a report that has not been assigned yet';
      end if;
      if coalesce(trim(new.cancel_reason), '') = '' then
        raise exception 'Please give a reason for cancelling';
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- the two collector actions
create or replace function public.accept_job(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reports set accepted_at = now()
  where id = p_id and assigned_to = auth.uid() and status = 'assigned' and accepted_at is null;
  if not found then raise exception 'This job cannot be accepted'; end if;
end;
$$;
grant execute on function public.accept_job(uuid) to authenticated;

create or replace function public.decline_job(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Please give a reason for declining';
  end if;
  update public.reports
  set status = 'approved', assigned_to = null, accepted_at = null,
      declined_by = auth.uid(), declined_at = now(),
      decline_reason = left(trim(p_reason), 200)
  where id = p_id and assigned_to = auth.uid() and status = 'assigned';
  if not found then raise exception 'This job can no longer be declined'; end if;
end;
$$;
grant execute on function public.decline_job(uuid, text) to authenticated;

-- notifications: "approved" only for a real approval
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
    if new.status = 'approved' and old.status = 'pending' then
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

-- admins hear about accepts and declines
create or replace function public.notify_job_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.accepted_at is not null and old.accepted_at is null then
    insert into notifications (user_id, report_id, title, body)
      select id, new.id, 'Job accepted',
             coalesce((select name from profiles where id = new.assigned_to), 'A collector')
             || ' accepted ' || coalesce(new.waste_type, 'a job')
      from profiles where role = 'admin';
  end if;
  if new.declined_at is not null and new.declined_at is distinct from old.declined_at then
    insert into notifications (user_id, report_id, title, body)
      select id, new.id, 'Job declined',
             coalesce((select name from profiles where id = new.declined_by), 'A collector')
             || ' declined ' || coalesce(new.waste_type, 'a job')
             || ': ' || coalesce(new.decline_reason, 'no reason given')
      from profiles where role = 'admin';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_response on public.reports;
create trigger trg_notify_response
  after update on public.reports
  for each row execute function public.notify_job_response();
