-- MindMatch — initial schema
-- Run in Supabase SQL Editor or via `supabase db push`.

create table if not exists services (
  id           bigserial primary key,
  name         text not null,
  duration_min integer not null,
  description  text,
  created_at   timestamptz default now()
);

create table if not exists available_slots (
  id         bigserial primary key,
  service_id bigint references services(id) on delete cascade,
  starts_at  timestamptz not null,
  is_taken   boolean default false,
  created_at timestamptz default now()
);
create index if not exists available_slots_starts_at_idx on available_slots(starts_at);
create index if not exists available_slots_is_taken_idx on available_slots(is_taken);

create table if not exists bookings (
  id                    bigserial primary key,
  slot_id               bigint references available_slots(id) unique,
  service_id            bigint references services(id),
  client_name           text not null,
  client_email          text not null,
  qualification_answers jsonb,
  diagnostic_report     text,
  created_at            timestamptz default now()
);
create index if not exists bookings_email_idx on bookings(client_email);

-- For the MVP we allow anonymous inserts/reads. In production, lock down with RLS policies.
alter table services         enable row level security;
alter table available_slots  enable row level security;
alter table bookings         enable row level security;

create policy "services_read_all"      on services        for select using (true);
create policy "slots_read_all"         on available_slots for select using (true);
create policy "slots_update_anon"      on available_slots for update using (true) with check (true);
create policy "bookings_insert_anon"   on bookings        for insert with check (true);
-- bookings reads are restricted to service-role only by default (no select policy = deny anon).

-- ----- Seed data -----

insert into services (name, duration_min, description) values
  ('Карьерный фокус',     60, 'Разобрать, что мешает двигаться в работе, и собрать план на 30 дней.'),
  ('Прорыв из выгорания', 90, 'Найти источник усталости и составить мягкий план восстановления.'),
  ('Точка А → точка Б',   60, 'Понять, где вы сейчас и куда хотите прийти — без давления и общих фраз.');

-- Seed 5 weekdays × 4 slots each, starting from tomorrow.
do $$
declare
  d date := (current_date + 1);
  added int := 0;
  hr int;
begin
  while added < 5 loop
    if extract(dow from d) not in (0, 6) then
      foreach hr in array array[10, 12, 15, 17] loop
        insert into available_slots (service_id, starts_at)
        select s.id, (d + make_interval(hours => hr))::timestamptz
        from services s;
      end loop;
      added := added + 1;
    end if;
    d := d + 1;
  end loop;
end $$;
