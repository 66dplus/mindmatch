-- MindMatch — initial schema
-- Apply via Supabase SQL Editor or `supabase db push`.

create extension if not exists "pgcrypto";

create table if not exists public.services (
  id           bigserial primary key,
  name         text not null,
  duration_min integer not null check (duration_min > 0),
  description  text
);

create table if not exists public.available_slots (
  id         bigserial primary key,
  service_id bigint references public.services(id) on delete cascade,
  starts_at  timestamptz not null,
  is_taken   boolean not null default false,
  unique (service_id, starts_at)
);

create index if not exists available_slots_starts_at_idx
  on public.available_slots (starts_at)
  where is_taken = false;

create table if not exists public.bookings (
  id                    bigserial primary key,
  slot_id               bigint references public.available_slots(id),
  service_id            bigint references public.services(id),
  client_name           text not null,
  client_email          text not null,
  qualification_answers jsonb,
  diagnostic_report     text,
  created_at            timestamptz not null default now()
);

create index if not exists bookings_created_at_idx
  on public.bookings (created_at desc);

-- Auto-mark the slot taken after a booking is inserted.
create or replace function public.mark_slot_taken()
returns trigger
language plpgsql
as $$
begin
  if new.slot_id is not null then
    update public.available_slots
       set is_taken = true
     where id = new.slot_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_mark_slot_taken on public.bookings;
create trigger trg_mark_slot_taken
  after insert on public.bookings
  for each row
  execute function public.mark_slot_taken();

-- — MVP RLS posture —
-- For this demo we allow anonymous inserts to `bookings` and reads of services/slots.
-- In production each coach would have an auth.user_id link and stricter rules.

alter table public.services        enable row level security;
alter table public.available_slots enable row level security;
alter table public.bookings        enable row level security;

drop policy if exists anon_read_services on public.services;
create policy anon_read_services on public.services
  for select to anon using (true);

drop policy if exists anon_read_slots on public.available_slots;
create policy anon_read_slots on public.available_slots
  for select to anon using (true);

drop policy if exists anon_update_slots on public.available_slots;
create policy anon_update_slots on public.available_slots
  for update to anon using (true) with check (true);

drop policy if exists anon_create_bookings on public.bookings;
create policy anon_create_bookings on public.bookings
  for insert to anon with check (true);
