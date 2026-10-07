-- =====================================================================
-- Electro Bodegón — esquema inicial (solo estructura, SIN datos)
-- =====================================================================
-- Contenido:
--   1. Esquema "private" (no expuesto por la API) y funciones auxiliares
--   2. Tablas: categories, brands, products, product_images, branches,
--      sellers, store_settings, admin_users
--   3. Triggers updated_at
--   4. Row Level Security + políticas
--   5. Privilegios (defensa en profundidad)
--   6. Storage: bucket "catalog-media" + políticas
--
-- Alta del primer administrador (una sola vez, desde el SQL Editor del panel,
-- que se ejecuta como "postgres" y no está sujeto a RLS):
--   1) Authentication → Users → "Add user" / "Invite" (registro público desactivado)
--   2) insert into public.admin_users (user_id, role)
--        values ('<uuid del usuario>', 'owner');
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Esquema privado y funciones auxiliares
-- ---------------------------------------------------------------------
-- "private" NO figura en los esquemas expuestos de la API (config.toml → api.schemas),
-- por lo que sus funciones no se pueden invocar como RPC desde el navegador.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

-- Mantiene updated_at en cada UPDATE
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.set_updated_at() from public;

-- Valida el arreglo de especificaciones: [{ "label": "...", "value": "..." }, ...]
create or replace function private.is_valid_specifications(specs jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when specs is null or jsonb_typeof(specs) <> 'array' then false
    else not exists (
      select 1
      from jsonb_array_elements(specs) as e(item)
      where jsonb_typeof(e.item) <> 'object'
         or jsonb_typeof(e.item -> 'label') is distinct from 'string'
         or jsonb_typeof(e.item -> 'value') is distinct from 'string'
         or btrim(e.item ->> 'label') = ''
         or btrim(e.item ->> 'value') = ''
         or length(e.item ->> 'label') > 80
         or length(e.item ->> 'value') > 300
    )
  end;
$$;
revoke all on function private.is_valid_specifications(jsonb) from public;
-- Necesario: el CHECK products_specifications_check se evalúa con los privilegios
-- de quien escribe (los administradores son "authenticated"). Es una función pura
-- de validación en un esquema no expuesto; anon no la necesita porque nunca escribe.
grant execute on function private.is_valid_specifications(jsonb) to authenticated;


-- ---------------------------------------------------------------------
-- 2. Tablas
-- ---------------------------------------------------------------------

-- Categorías (hoy: TV y Audio, Línea Blanca, Electrodomésticos Menores, Hogar)
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null,
  icon        text,                       -- clase Font Awesome, ej. "fas fa-tv"
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint categories_slug_key    unique (slug),
  constraint categories_name_check  check (btrim(name) <> '' and length(name) <= 80),
  constraint categories_slug_check  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  constraint categories_icon_check  check (icon is null or icon ~ '^[a-z0-9 -]{1,60}$')
);
create unique index categories_name_lower_key on public.categories (lower(name));
comment on table public.categories is 'Categorías del catálogo.';

-- Marcas (hoy: 10 en productos.json)
create table public.brands (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null,
  logo_path   text,                       -- ruta en Storage: brands/{id}/archivo (nunca URL)
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint brands_slug_key       unique (slug),
  constraint brands_name_check     check (btrim(name) <> '' and length(name) <= 80),
  constraint brands_slug_check     check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  constraint brands_logo_path_check check (
    logo_path is null
    or (logo_path like 'brands/' || id::text || '/%' and logo_path ~ '^brands/[0-9a-f-]{36}/[A-Za-z0-9][A-Za-z0-9._-]{0,120}$')
  )
);
create unique index brands_name_lower_key on public.brands (lower(name));
comment on table public.brands is 'Marcas del catálogo.';

-- Productos (basado en productos.json + modelo Producto de Angular)
create table public.products (
  id                     uuid primary key default gen_random_uuid(),
  legacy_id              integer,          -- id numérico de productos.json (1..55)
  slug                   text not null,
  name                   text not null,
  brand_id               uuid not null references public.brands (id) on delete restrict,
  category_id            uuid not null references public.categories (id) on delete restrict,
  model                  text,
  sku                    text,
  short_description      text,             -- productos.json: "descripcion"
  description            text,
  price                  numeric(12,2) not null,   -- productos.json: "precio_oferta"
  compare_at_price       numeric(12,2),            -- productos.json: "precio_original"
  badge                  text,                     -- productos.json: "etiqueta" (ej. "-18%")
  is_featured            boolean not null default false, -- productos.json: "destacado"
  is_published           boolean not null default false,
  availability           text,
  stock                  integer,
  color                  text,
  capacity               text,
  power                  text,
  voltage                text,
  width_cm               numeric(8,2),
  height_cm              numeric(8,2),
  depth_cm               numeric(8,2),
  weight_kg              numeric(8,2),
  warranty               text,
  dimensions_image_path  text,             -- ruta en Storage: dimensions/{id}/archivo
  specifications         jsonb not null default '[]'::jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint products_legacy_id_key   unique (legacy_id),
  constraint products_slug_key        unique (slug),
  constraint products_sku_key         unique (sku),
  constraint products_legacy_id_check check (legacy_id is null or legacy_id > 0),
  constraint products_slug_check      check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 120),
  constraint products_name_check      check (btrim(name) <> '' and length(name) <= 200),
  constraint products_model_check     check (model is null or (btrim(model) <> '' and length(model) <= 80)),
  constraint products_sku_check       check (sku is null or (btrim(sku) <> '' and length(sku) <= 64)),
  constraint products_short_desc_check check (short_description is null or length(short_description) <= 300),
  constraint products_desc_check      check (description is null or length(description) <= 10000),
  constraint products_price_check     check (price >= 0),
  constraint products_compare_at_price_check check (compare_at_price is null or compare_at_price > price),
  constraint products_badge_check     check (badge is null or (btrim(badge) <> '' and length(badge) <= 30)),
  constraint products_availability_check check (
    availability is null or availability in ('in_stock', 'low_stock', 'backorder', 'out_of_stock')
  ),
  constraint products_stock_check     check (stock is null or stock >= 0),
  constraint products_attrs_check     check (
        (color    is null or length(color)    <= 60)
    and (capacity is null or length(capacity) <= 60)
    and (power    is null or length(power)    <= 60)
    and (voltage  is null or length(voltage)  <= 60)
    and (warranty is null or length(warranty) <= 120)
  ),
  constraint products_dimensions_check check (
        (width_cm  is null or width_cm  > 0)
    and (height_cm is null or height_cm > 0)
    and (depth_cm  is null or depth_cm  > 0)
    and (weight_kg is null or weight_kg > 0)
  ),
  constraint products_dimensions_image_path_check check (
    dimensions_image_path is null
    or (dimensions_image_path like 'dimensions/' || id::text || '/%'
        and dimensions_image_path ~ '^dimensions/[0-9a-f-]{36}/[A-Za-z0-9][A-Za-z0-9._-]{0,120}$')
  ),
  constraint products_specifications_check check (private.is_valid_specifications(specifications))
);
create index products_brand_id_idx    on public.products (brand_id);
create index products_category_id_idx on public.products (category_id);
create index products_published_idx   on public.products (is_featured, category_id) where is_published;
comment on table public.products is 'Productos. "enOferta" no se guarda: se calcula (compare_at_price > price).';
comment on column public.products.availability is 'in_stock | low_stock | backorder | out_of_stock (null = no se muestra)';

-- Imágenes de producto (la de menor position es la principal)
create table public.product_images (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products (id) on delete cascade,
  storage_path  text,                      -- products/{product_id}/archivo
  external_url  text,                      -- solo para la migración inicial (fotos actuales)
  alt_text      text,
  width         integer,
  height        integer,
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint product_images_position_key unique (product_id, position) deferrable initially immediate,
  constraint product_images_source_check check (num_nonnulls(storage_path, external_url) = 1),
  constraint product_images_storage_path_check check (
    storage_path is null
    or (storage_path like 'products/' || product_id::text || '/%'
        and storage_path ~ '^products/[0-9a-f-]{36}/[A-Za-z0-9][A-Za-z0-9._-]{0,120}$')
  ),
  constraint product_images_external_url_check check (
    external_url is null or (external_url ~ '^https://[^\s]+$' and length(external_url) <= 2048)
  ),
  constraint product_images_alt_check      check (alt_text is null or length(alt_text) <= 200),
  constraint product_images_size_check     check ((width is null or width > 0) and (height is null or height > 0)),
  constraint product_images_position_check check (position >= 0)
);
comment on table public.product_images is 'Imágenes de producto. Se guarda la ruta de Storage, no la URL pública.';

-- Sucursales (hoy en STORE_CONFIG: norte, sur)
create table public.branches (
  id             uuid primary key default gen_random_uuid(),
  code           text not null,            -- identificador legible: "norte", "sur"
  name           text not null,
  zone           text,
  short_name     text,
  address        text not null,
  phone_display  text,
  opening_hours  text,
  icon           text,
  map_query      text,                     -- texto de búsqueda del mapa (nunca una URL)
  latitude       numeric(9,6),
  longitude      numeric(9,6),
  sort_order     integer not null default 0,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint branches_code_key        unique (code),
  constraint branches_code_check      check (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(code) <= 40),
  constraint branches_name_check      check (btrim(name) <> '' and length(name) <= 120),
  constraint branches_address_check   check (btrim(address) <> '' and length(address) <= 200),
  constraint branches_text_check      check (
        (zone          is null or length(zone)          <= 80)
    and (short_name    is null or length(short_name)    <= 40)
    and (phone_display is null or length(phone_display) <= 40)
    and (opening_hours is null or length(opening_hours) <= 200)
  ),
  constraint branches_icon_check      check (icon is null or icon ~ '^[a-z0-9 -]{1,60}$'),
  -- Misma regla que MapEmbedService: texto o coordenadas, nunca una URL ni un esquema
  constraint branches_map_query_check check (
    map_query is null
    or (btrim(map_query) <> ''
        and length(map_query) <= 200
        and map_query !~* '^[a-z][a-z0-9+.-]*:'
        and position('://' in map_query) = 0
        and left(map_query, 2) <> '//'
        and map_query !~ '[[:cntrl:]]')
  ),
  constraint branches_coords_check    check (
    (latitude is null) = (longitude is null)
    and (latitude  is null or latitude  between -90  and 90)
    and (longitude is null or longitude between -180 and 180)
  )
);
comment on table public.branches is 'Sucursales físicas.';

-- Vendedores / asesores (WhatsApp de cada sucursal)
create table public.sellers (
  id          uuid primary key default gen_random_uuid(),
  branch_id   uuid not null references public.branches (id) on delete restrict,
  name        text not null,
  title       text,                        -- "Asesora", "Asesor"
  whatsapp    text not null,               -- formato internacional sin "+": 593986952147
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint sellers_name_check     check (btrim(name) <> '' and length(name) <= 80),
  constraint sellers_title_check    check (title is null or length(title) <= 40),
  constraint sellers_whatsapp_check check (whatsapp ~ '^[0-9]{8,15}$')
);
create index sellers_branch_id_idx on public.sellers (branch_id);
comment on table public.sellers is 'Vendedores/asesores por sucursal.';

-- Ajustes generales de la tienda (una sola fila)
create table public.store_settings (
  id              smallint primary key default 1,
  store_name      text not null,
  main_whatsapp   text,
  facebook_url    text,
  instagram_url   text,
  tiktok_url      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint store_settings_singleton_check check (id = 1),
  constraint store_settings_name_check      check (btrim(store_name) <> '' and length(store_name) <= 120),
  constraint store_settings_whatsapp_check  check (main_whatsapp is null or main_whatsapp ~ '^[0-9]{8,15}$'),
  constraint store_settings_urls_check      check (
        (facebook_url  is null or (facebook_url  ~ '^https://[^\s]+$' and length(facebook_url)  <= 300))
    and (instagram_url is null or (instagram_url ~ '^https://[^\s]+$' and length(instagram_url) <= 300))
    and (tiktok_url    is null or (tiktok_url    ~ '^https://[^\s]+$' and length(tiktok_url)    <= 300))
  )
);
comment on table public.store_settings is 'Ajustes generales de la tienda (fila única id = 1).';

-- Administradores (el rol NUNCA se guarda en user_metadata, que el usuario puede editar)
create table public.admin_users (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  role        text not null default 'admin',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint admin_users_role_check check (role in ('owner', 'admin', 'editor'))
);
comment on table public.admin_users is 'Usuarios con acceso al panel. Solo se gestiona desde el panel de Supabase (SQL), nunca desde el frontend.';


-- ---------------------------------------------------------------------
-- 2b. is_admin(): comprobación de administrador para las políticas RLS
-- ---------------------------------------------------------------------
-- SECURITY DEFINER: se ejecuta como su dueño (postgres), que no está sujeto a RLS
-- en admin_users → evita recursión y no depende de los permisos del que llama.
-- Solo LEE: devuelve true/false sobre el usuario actual (auth.uid()); no recibe
-- parámetros, así que no sirve para consultar a otros usuarios.
-- search_path vacío + nombres totalmente calificados → inmune a secuestro de search_path.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users as au
    where au.user_id = (select auth.uid())
  );
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;


-- ---------------------------------------------------------------------
-- 3. Triggers updated_at
-- ---------------------------------------------------------------------
create trigger categories_set_updated_at     before update on public.categories     for each row execute function private.set_updated_at();
create trigger brands_set_updated_at         before update on public.brands         for each row execute function private.set_updated_at();
create trigger products_set_updated_at       before update on public.products       for each row execute function private.set_updated_at();
create trigger product_images_set_updated_at before update on public.product_images for each row execute function private.set_updated_at();
create trigger branches_set_updated_at       before update on public.branches       for each row execute function private.set_updated_at();
create trigger sellers_set_updated_at        before update on public.sellers        for each row execute function private.set_updated_at();
create trigger store_settings_set_updated_at before update on public.store_settings for each row execute function private.set_updated_at();
create trigger admin_users_set_updated_at    before update on public.admin_users    for each row execute function private.set_updated_at();


-- ---------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------
alter table public.categories     enable row level security;
alter table public.brands         enable row level security;
alter table public.products       enable row level security;
alter table public.product_images enable row level security;
alter table public.branches       enable row level security;
alter table public.sellers        enable row level security;
alter table public.store_settings enable row level security;
alter table public.admin_users    enable row level security;

-- ---- categories ----
create policy categories_select on public.categories
  for select to anon, authenticated
  using (is_active or (select private.is_admin()));
create policy categories_insert_admin on public.categories
  for insert to authenticated with check ((select private.is_admin()));
create policy categories_update_admin on public.categories
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy categories_delete_admin on public.categories
  for delete to authenticated using ((select private.is_admin()));

-- ---- brands ----
create policy brands_select on public.brands
  for select to anon, authenticated
  using (is_active or (select private.is_admin()));
create policy brands_insert_admin on public.brands
  for insert to authenticated with check ((select private.is_admin()));
create policy brands_update_admin on public.brands
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy brands_delete_admin on public.brands
  for delete to authenticated using ((select private.is_admin()));

-- ---- products ----
create policy products_select on public.products
  for select to anon, authenticated
  using (is_published or (select private.is_admin()));
create policy products_insert_admin on public.products
  for insert to authenticated with check ((select private.is_admin()));
create policy products_update_admin on public.products
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy products_delete_admin on public.products
  for delete to authenticated using ((select private.is_admin()));

-- ---- product_images: visibles solo si su producto está publicado ----
create policy product_images_select on public.product_images
  for select to anon, authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.products p
      where p.id = product_images.product_id and p.is_published
    )
  );
create policy product_images_insert_admin on public.product_images
  for insert to authenticated with check ((select private.is_admin()));
create policy product_images_update_admin on public.product_images
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy product_images_delete_admin on public.product_images
  for delete to authenticated using ((select private.is_admin()));

-- ---- branches ----
create policy branches_select on public.branches
  for select to anon, authenticated
  using (is_active or (select private.is_admin()));
create policy branches_insert_admin on public.branches
  for insert to authenticated with check ((select private.is_admin()));
create policy branches_update_admin on public.branches
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy branches_delete_admin on public.branches
  for delete to authenticated using ((select private.is_admin()));

-- ---- sellers ----
create policy sellers_select on public.sellers
  for select to anon, authenticated
  using (is_active or (select private.is_admin()));
create policy sellers_insert_admin on public.sellers
  for insert to authenticated with check ((select private.is_admin()));
create policy sellers_update_admin on public.sellers
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy sellers_delete_admin on public.sellers
  for delete to authenticated using ((select private.is_admin()));

-- ---- store_settings: lectura pública; solo se edita (la fila se crea al migrar datos) ----
create policy store_settings_select on public.store_settings
  for select to anon, authenticated
  using (true);
create policy store_settings_update_admin on public.store_settings
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- ---- admin_users: cada usuario ve solo su propia fila ----
-- Sin políticas de INSERT/UPDATE/DELETE: desde la API nadie puede crear,
-- modificar ni autoasignarse un rol. Solo postgres/service_role (panel/SQL).
create policy admin_users_select_own on public.admin_users
  for select to authenticated
  using (user_id = (select auth.uid()));


-- ---------------------------------------------------------------------
-- 5. Privilegios (defensa en profundidad; RLS sigue siendo la barrera principal)
-- ---------------------------------------------------------------------
-- anon nunca escribe; nadie usa TRUNCATE/REFERENCES/TRIGGER desde la API.
revoke insert, update, delete, truncate, references, trigger
  on public.categories, public.brands, public.products, public.product_images,
     public.branches, public.sellers, public.store_settings, public.admin_users
  from anon;
revoke truncate, references, trigger
  on public.categories, public.brands, public.products, public.product_images,
     public.branches, public.sellers, public.store_settings, public.admin_users
  from authenticated;
-- store_settings: fila única, no se crea ni borra desde la API
revoke insert, delete on public.store_settings from authenticated;
-- admin_users: solo lectura de la propia fila
revoke insert, update, delete on public.admin_users from authenticated;
revoke all on public.admin_users from anon;


-- ---------------------------------------------------------------------
-- 6. Storage: bucket "catalog-media"
-- ---------------------------------------------------------------------
-- Público para LECTURA por URL (fotos de catálogo, cacheables por CDN).
-- No se crea política SELECT para anon: se pueden ver las imágenes por su URL,
-- pero no listar el contenido del bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalog-media',
  'catalog-media',
  true,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

-- Rutas permitidas: {products|brands|dimensions}/{uuid}/{archivo}
create policy catalog_media_select_admin on storage.objects
  for select to authenticated
  using (bucket_id = 'catalog-media' and (select private.is_admin()));

create policy catalog_media_insert_admin on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'catalog-media'
    and (select private.is_admin())
    and name ~ '^(products|brands|dimensions)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9][A-Za-z0-9._-]{0,120}$'
  );

create policy catalog_media_update_admin on storage.objects
  for update to authenticated
  using (bucket_id = 'catalog-media' and (select private.is_admin()))
  with check (
    bucket_id = 'catalog-media'
    and (select private.is_admin())
    and name ~ '^(products|brands|dimensions)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9][A-Za-z0-9._-]{0,120}$'
  );

create policy catalog_media_delete_admin on storage.objects
  for delete to authenticated
  using (bucket_id = 'catalog-media' and (select private.is_admin()));
