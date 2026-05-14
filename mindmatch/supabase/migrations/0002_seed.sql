-- Seed services + the next ~10 weekday slots per service.
-- Re-running is safe: services use names as a soft idempotency key.

insert into public.services (name, duration_min, description)
select v.name, v.duration_min, v.description
from (
  values
    ('Карьерный фокус', 60, 'Разобрать, что мешает двигаться в работе, и собрать план на 30 дней.'),
    ('Прорыв из выгорания', 90, 'Найти источник усталости и составить мягкий план восстановления.'),
    ('Точка А → точка Б', 60, 'Понять, где вы сейчас и куда хотите прийти — без давления и общих фраз.')
) as v(name, duration_min, description)
where not exists (select 1 from public.services s where s.name = v.name);

-- Generate slots: next 10 working days, hours 10/12/15/17 local-ish (timestamptz at UTC+3).
do $$
declare
  svc record;
  day_offset int;
  hr int;
  slot_ts timestamptz;
begin
  for svc in select id from public.services loop
    for day_offset in 1..14 loop
      slot_ts := (date_trunc('day', now() + (day_offset || ' days')::interval));
      -- skip Sat (6) and Sun (0) using ISO dow
      continue when extract(isodow from slot_ts) >= 6;
      for hr in select unnest(array[10, 12, 15, 17]) loop
        slot_ts := date_trunc('day', now() + (day_offset || ' days')::interval) + (hr || ' hours')::interval;
        insert into public.available_slots (service_id, starts_at, is_taken)
        values (svc.id, slot_ts, false)
        on conflict (service_id, starts_at) do nothing;
      end loop;
    end loop;
  end loop;
end$$;
