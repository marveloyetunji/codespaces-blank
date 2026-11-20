-- Report workflow rules, enforced in the database. Run second.
-- Flow: pending -> approved -> assigned -> in_progress -> collected
-- Exits: rejected (admin), cancelled (resident, before assignment)

alter table public.reports replica identity full;

-- timestamps for each status change
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
  return new;
end;
$$;

drop trigger if exists trg_collected_at on public.reports;
drop trigger if exists trg_status_times on public.reports;
create trigger trg_status_times
  before update on public.reports
  for each row execute function public.set_status_times();

-- hazardous waste is urgent
create or replace function public.set_priority()
returns trigger language plpgsql as $$
begin
  new.priority := case when new.waste_type = 'Hazardous' then 'urgent' else 'normal' end;
  return new;
end;
$$;

drop trigger if exists trg_priority on public.reports;
create trigger trg_priority
  before insert on public.reports
  for each row execute function public.set_priority();

-- preferred collection date cannot be in the past
create or replace function public.check_preferred_date()
returns trigger language plpgsql as $$
begin
  if new.preferred_date is not null and new.preferred_date < current_date - 1 then
    raise exception 'Choose today or a later date';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_check_date on public.reports;
create trigger trg_check_date
  before insert on public.reports
  for each row execute function public.check_preferred_date();

-- who may change what, and which status changes are valid
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

  if new.user_id is distinct from old.user_id
     or new.lat is distinct from old.lat
     or new.lng is distinct from old.lng
     or new.priority is distinct from old.priority
     or new.assigned_to is distinct from old.assigned_to
     or new.rejection_reason is distinct from old.rejection_reason then
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

drop trigger if exists trg_enforce_rules on public.reports;
create trigger trg_enforce_rules
  before update on public.reports
  for each row execute function public.enforce_report_rules();

-- resident actions go through functions, not direct updates
create or replace function public.cancel_report(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Please give a reason for cancelling';
  end if;
  update public.reports
  set status = 'cancelled', cancel_reason = left(trim(p_reason), 200)
  where id = p_id and user_id = auth.uid() and status in ('pending','approved');
  if not found then
    raise exception 'This report can no longer be cancelled';
  end if;
end;
$$;
grant execute on function public.cancel_report(uuid, text) to authenticated;

create or replace function public.rate_report(p_id uuid, p_rating int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be 1 to 5';
  end if;
  update public.reports
  set rating = p_rating
  where id = p_id and user_id = auth.uid() and status = 'collected' and rating is null;
end;
$$;
grant execute on function public.rate_report(uuid, int) to authenticated;

create or replace function public.reschedule_report(p_id uuid, p_date date, p_slot text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_date < current_date - 1 then raise exception 'Choose today or a later date'; end if;
  if p_slot is not null and p_slot not in ('morning','afternoon','evening') then
    raise exception 'Invalid time slot';
  end if;
  update public.reports set preferred_date = p_date, preferred_slot = p_slot
  where id = p_id and user_id = auth.uid() and status in ('pending','approved','assigned');
  if not found then raise exception 'This report can no longer be rescheduled'; end if;
end;
$$;
grant execute on function public.reschedule_report(uuid, date, text) to authenticated;

-- duplicate check: counts open reports near a point, returns no private data
create or replace function public.count_nearby_reports(
  p_lat double precision, p_lng double precision, p_meters int default 50)
returns int
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int from public.reports
  where status not in ('collected','rejected','cancelled')
    and 6371000 * 2 * asin(sqrt(
      power(sin(radians(lat - p_lat) / 2), 2) +
      cos(radians(p_lat)) * cos(radians(lat)) *
      power(sin(radians(lng - p_lng) / 2), 2)
    )) <= p_meters;
$$;
grant execute on function public.count_nearby_reports(double precision, double precision, int) to authenticated;
