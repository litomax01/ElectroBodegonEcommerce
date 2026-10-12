-- Semilla de sucursales, asesores y ajustes generales (valores que hoy están en store.config.ts).
-- Idempotente: se puede ejecutar más de una vez; NO pisa lo que el administrador ya editó
-- (solo inserta lo que falta).
-- Remoto:  npx supabase@2.120.0 db query --linked --file scripts/tienda/semilla-tienda.sql
do $$
declare
  v_norte uuid;
  v_sur   uuid;
begin
  insert into public.branches
    (code, name, zone, short_name, address, phone_display, opening_hours, icon, map_query,
     open_days, opens_at, closes_at, sort_order)
  values
    ('norte', 'Electro Bodegón Norte', 'Sucursal Norte', 'Norte', 'Av. Del Maestro y Sebastián Buara',
     '0986 952 147', 'Lun – Sáb: 9:00 AM – 7:00 PM', 'fas fa-map-marker-alt', 'Av. Del Maestro y Sebastián Buara',
     array['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'], '09:00', '19:00', 1),
    ('sur', 'Electro Bodegón Sur', 'Sucursal Sur', 'Sur', 'Dr. José Peralta y Amaluza',
     '0958 771 384', 'Lun – Sáb: 9:00 AM – 7:00 PM', 'fas fa-store', 'Dr. José Peralta y Amaluza',
     array['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'], '09:00', '19:00', 2)
  on conflict (code) do nothing;

  select id into v_norte from public.branches where code = 'norte';
  select id into v_sur   from public.branches where code = 'sur';

  insert into public.sellers (branch_id, name, title, whatsapp, sort_order)
  select v_norte, 'Elizabeth', 'Asesora', '593986952147', 1
  where not exists (select 1 from public.sellers where branch_id = v_norte);

  insert into public.sellers (branch_id, name, title, whatsapp, sort_order)
  select v_sur, 'Fernando', 'Asesor', '593958771384', 1
  where not exists (select 1 from public.sellers where branch_id = v_sur);

  insert into public.store_settings (id, store_name, main_whatsapp)
  values (1, 'Electro Bodegón', '593986952147')
  on conflict (id) do nothing;
end $$;
