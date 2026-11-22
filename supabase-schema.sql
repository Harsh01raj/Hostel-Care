create table public.room_assignments (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(trim(email))),
  hostel text not null check (length(trim(hostel)) > 0),
  room text not null check (length(trim(room)) > 0),
  created_at timestamptz not null default now()
);

alter table public.room_assignments enable row level security;

create policy "Students can view their own room assignment"
  on public.room_assignments
  for select
  to authenticated
  using (email = lower((select auth.jwt() ->> 'email')));

grant select on public.room_assignments to authenticated;

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  email text not null,
  hostel text not null,
  room text not null,
  type text not null check (type in ('Cleaning request', 'Cleaning complaint')),
  name text not null check (length(trim(name)) between 1 and 60),
  date date,
  time text,
  category text,
  details text not null check (length(trim(details)) between 1 and 500),
  status text not null default 'Pending' check (status in ('Pending', 'In Progress', 'Completed')),
  created_at timestamptz not null default now(),
  check (type <> 'Cleaning request' or date is not null),
  check (date is null or date >= current_date),
  check (type <> 'Cleaning complaint' or category is not null)
);

create function public.apply_request_room_assignment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  verified_email text;
  assignment public.room_assignments%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in with a verified email before submitting a request.';
  end if;

  select lower(u.email)
    into verified_email
    from auth.users as u
    where u.id = auth.uid();

  select *
    into assignment
    from public.room_assignments as a
    where a.email = verified_email;

  if not found then
    raise exception 'No approved room assignment exists for this email.';
  end if;

  new.user_id := auth.uid();
  new.email := assignment.email;
  new.hostel := assignment.hostel;
  new.room := assignment.room;
  new.status := 'Pending';
  return new;
end;
$$;

create trigger set_request_room_assignment
  before insert on public.service_requests
  for each row execute function public.apply_request_room_assignment();

alter table public.service_requests enable row level security;

create policy "Students can view their own requests"
  on public.service_requests
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Students can submit requests for themselves"
  on public.service_requests
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

grant select, insert on public.service_requests to authenticated;

  
