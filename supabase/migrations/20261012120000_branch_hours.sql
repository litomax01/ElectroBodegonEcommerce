-- Horario estructurado de las sucursales (días + apertura + cierre).
-- Hasta ahora solo existía opening_hours (texto para mostrar). Con estos campos el panel genera ese
-- texto y la tienda publica openingHoursSpecification (schema.org) sin parsear texto libre.
-- Cambio ADITIVO: columnas nulas, no toca filas existentes.

alter table public.branches
  add column open_days text[],
  add column opens_at  time,
  add column closes_at time;

alter table public.branches
  add constraint branches_hours_check check (
    (open_days is null and opens_at is null and closes_at is null)
    or (
      open_days is not null
      and opens_at is not null
      and closes_at is not null
      and cardinality(open_days) between 1 and 7
      and open_days <@ array['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']::text[]
      and opens_at < closes_at
    )
  );

comment on column public.branches.open_days is 'Días de atención (nombres schema.org en inglés).';
