-- Portada editable: banners propios del carrusel, textos/fotos/productos de las diapositivas
-- automáticas (con vuelta al original) + interruptores + foto de cada asesor.
-- Cambio ADITIVO: tabla nueva, columnas con valor por defecto y ruta nueva de Storage.
-- Sin banners propios y con los valores por defecto, la portada se ve exactamente igual que antes.

-- ---------------------------------------------------------------------
-- 1. Banners propios (primeras diapositivas del carrusel)
-- ---------------------------------------------------------------------
create table public.home_banners (
  id           uuid primary key default gen_random_uuid(),
  layout       text not null default 'texto_foto',   -- texto_foto | solo_imagen
  theme        text not null default 'rojo',         -- rojo | blanco (solo texto_foto)
  eyebrow      text,                                 -- etiqueta pequeña sobre el título
  title        text,
  body         text,
  button_label text,
  button_link  text,                                 -- ruta interna "/catalogo..." o https://...
  image_path   text,                                 -- ruta en el bucket catalog-media (banners/...)
  image_alt    text,
  sort_order   integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint home_banners_layout_check check (layout in ('texto_foto', 'solo_imagen')),
  constraint home_banners_theme_check  check (theme in ('rojo', 'blanco')),
  constraint home_banners_text_check   check (
        (eyebrow      is null or length(eyebrow)      <= 60)
    and (title        is null or length(title)        <= 80)
    and (body         is null or length(body)         <= 220)
    and (button_label is null or length(button_label) <= 30)
    and (image_alt    is null or length(image_alt)    <= 160)
  ),
  -- Ruta interna (empieza con una sola "/") o https://; nunca javascript:, data: ni //host
  constraint home_banners_link_check   check (
    button_link is null
    or (length(button_link) <= 300
        and (button_link ~ '^/([^/\s][^\s]*)?$' or button_link ~ '^https://[^\s]+$'))
  ),
  constraint home_banners_image_check  check (
    image_path is null
    or image_path ~ '^banners/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9][A-Za-z0-9._-]{0,120}$'
  ),
  -- Un banner debe poder mostrarse: "solo imagen" necesita imagen; "texto y foto" necesita título
  constraint home_banners_content_check check (
    (layout = 'solo_imagen' and image_path is not null)
    or (layout = 'texto_foto' and title is not null and btrim(title) <> '')
  )
);
create index home_banners_order_idx on public.home_banners (sort_order, created_at);
comment on table public.home_banners is 'Banners propios del carrusel de la portada, editables desde el panel.';

create trigger home_banners_set_updated_at before update on public.home_banners
  for each row execute function private.set_updated_at();

alter table public.home_banners enable row level security;

create policy home_banners_select on public.home_banners
  for select to anon, authenticated
  using (is_active or (select private.is_admin()));
create policy home_banners_insert_admin on public.home_banners
  for insert to authenticated with check ((select private.is_admin()));
create policy home_banners_update_admin on public.home_banners
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy home_banners_delete_admin on public.home_banners
  for delete to authenticated using ((select private.is_admin()));

-- Visitantes solo leen; escribir exige además ser administrador (RLS)
revoke insert, update, delete, truncate, references, trigger on public.home_banners from anon;
revoke truncate, references, trigger on public.home_banners from authenticated;

-- ---------------------------------------------------------------------
-- 2. Diapositivas automáticas: se pueden apagar y se elige la velocidad
-- ---------------------------------------------------------------------
alter table public.store_settings
  add column hero_show_offers   boolean  not null default true,
  add column hero_show_welcome  boolean  not null default true,
  add column hero_show_promos   boolean  not null default true,
  add column hero_show_advisors boolean  not null default true,
  add column hero_interval_secs smallint not null default 7;

alter table public.store_settings
  add constraint store_settings_hero_interval_check check (hero_interval_secs between 3 and 20);

-- ---------------------------------------------------------------------
-- 3. Personalización de las diapositivas automáticas (textos y fotos por posición)
--    Campo en NULL / sin fila = se usa el texto/foto original de la tienda.
--    "Volver al original" = borrar las filas.
-- ---------------------------------------------------------------------
create table public.hero_slides (
  slide_key    text primary key,
  eyebrow      text,
  title        text,
  subtitle     text,
  body         text,
  bullets      text[],
  button_label text,
  updated_at   timestamptz not null default now(),
  constraint hero_slides_key_check check (slide_key in ('ofertas', 'bienvenida', 'promos', 'asesoria')),
  constraint hero_slides_text_check check (
        (eyebrow      is null or length(eyebrow)      <= 80)
    and (title        is null or length(title)        <= 100)
    and (subtitle     is null or length(subtitle)     <= 120)
    and (body         is null or length(body)         <= 260)
    and (button_label is null or length(button_label) <= 30)
    and (bullets      is null or (cardinality(bullets) <= 4 and array_to_string(bullets, '') !~ '[[:cntrl:]]'))
  )
);
comment on table public.hero_slides is 'Textos que personalizan las diapositivas automáticas de la portada (NULL = original).';

-- Fotos reemplazables por posición: "ofertas:2" = segunda foto de la vitrina; sin fila = foto original.
create table public.hero_slide_images (
  slide_key  text not null,
  slot       smallint not null,
  image_path text not null,
  updated_at timestamptz not null default now(),
  primary key (slide_key, slot),
  constraint hero_slide_images_key_check  check (slide_key in ('ofertas', 'bienvenida', 'promos')),
  constraint hero_slide_images_slot_check check (slot between 1 and 4),
  constraint hero_slide_images_path_check check (
    image_path ~ '^banners/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9][A-Za-z0-9._-]{0,120}$'
  )
);
comment on table public.hero_slide_images is 'Fotos propias que reemplazan, posición por posición, las de las diapositivas automáticas.';

create trigger hero_slides_set_updated_at before update on public.hero_slides
  for each row execute function private.set_updated_at();
create trigger hero_slide_images_set_updated_at before update on public.hero_slide_images
  for each row execute function private.set_updated_at();

alter table public.hero_slides       enable row level security;
alter table public.hero_slide_images enable row level security;

create policy hero_slides_select on public.hero_slides
  for select to anon, authenticated using (true);
create policy hero_slides_insert_admin on public.hero_slides
  for insert to authenticated with check ((select private.is_admin()));
create policy hero_slides_update_admin on public.hero_slides
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy hero_slides_delete_admin on public.hero_slides
  for delete to authenticated using ((select private.is_admin()));

create policy hero_slide_images_select on public.hero_slide_images
  for select to anon, authenticated using (true);
create policy hero_slide_images_insert_admin on public.hero_slide_images
  for insert to authenticated with check ((select private.is_admin()));
create policy hero_slide_images_update_admin on public.hero_slide_images
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy hero_slide_images_delete_admin on public.hero_slide_images
  for delete to authenticated using ((select private.is_admin()));

revoke insert, update, delete, truncate, references, trigger
  on public.hero_slides, public.hero_slide_images from anon;
revoke truncate, references, trigger
  on public.hero_slides, public.hero_slide_images from authenticated;

-- ---------------------------------------------------------------------
-- 4. Foto opcional de cada asesor (si no hay, la tienda usa la foto de respaldo)
-- ---------------------------------------------------------------------
alter table public.sellers add column photo_path text;
alter table public.sellers add constraint sellers_photo_check check (
  photo_path is null
  or photo_path ~ '^sellers/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9][A-Za-z0-9._-]{0,120}$'
);

-- ---------------------------------------------------------------------
-- 5. Storage: se permite la ruta banners/{uuid}/{archivo}
-- ---------------------------------------------------------------------
drop policy catalog_media_insert_admin on storage.objects;
drop policy catalog_media_update_admin on storage.objects;

create policy catalog_media_insert_admin on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'catalog-media'
    and (select private.is_admin())
    and name ~ '^(products|brands|dimensions|banners|sellers)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9][A-Za-z0-9._-]{0,120}$'
  );

create policy catalog_media_update_admin on storage.objects
  for update to authenticated
  using (bucket_id = 'catalog-media' and (select private.is_admin()))
  with check (
    bucket_id = 'catalog-media'
    and (select private.is_admin())
    and name ~ '^(products|brands|dimensions|banners|sellers)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9][A-Za-z0-9._-]{0,120}$'
  );
