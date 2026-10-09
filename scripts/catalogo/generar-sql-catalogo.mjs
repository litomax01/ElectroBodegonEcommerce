#!/usr/bin/env node
/**
 * Genera el SQL de la carga ÚNICA del catálogo a partir de productos.json.
 *
 *   node scripts/catalogo/generar-sql-catalogo.mjs
 *
 * Salida: scripts/catalogo/generado/catalogo-inicial.sql (NO va a supabase/migrations:
 * `db push` no debe aplicarlo). Se ejecuta con la CLI ya enlazada, sin claves nuevas:
 *
 *   npx supabase@2.120.0 db query --linked --file scripts/catalogo/generado/catalogo-inicial.sql
 *
 * Atomicidad: todo el SQL es UN solo bloque DO (una sola sentencia = una sola
 * transacción). Cualquier RAISE EXCEPTION o error deshace TODO. No hay UPDATE ni DELETE.
 * Estado esperado: categories, brands, products y product_images vacías; si no,
 * aborta sin tocar nada (así una segunda ejecución nunca duplica).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RAIZ, construirPlan, leerProductosJson } from './catalogo-comun.mjs';

const plan = construirPlan(leerProductosJson());
if (plan.errores.length) {
  plan.errores.forEach(e => console.error(`ERROR: ${e}`));
  process.exit(1);
}
const { categorias, marcas, productos, imagenes } = plan;
if (categorias.length !== 4 || marcas.length !== 10 || productos.length !== 55 || imagenes.length !== 55) {
  console.error(`Conteos inesperados: ${categorias.length}/${marcas.length}/${productos.length}/${imagenes.length}`);
  process.exit(1);
}

const TAG = '$catalogo$';
const lit = v => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2);
  const s = String(v);
  if (s.includes(TAG)) throw new Error('El dato contiene el delimitador del bloque DO');
  if (s.includes('\0')) throw new Error('Dato con byte nulo');
  return `'${s.replace(/'/g, "''")}'`;
};
const num2 = v => (v === null ? 'null' : Number(v).toFixed(2));
const filas = (arr, f) => arr.map(x => `    (${f(x)})`).join(',\n');

const sql = `-- =====================================================================
-- Carga ÚNICA del catálogo inicial (generado desde public/assets/data/productos.json)
-- NO editar a mano: regenerar con scripts/catalogo/generar-sql-catalogo.mjs
-- Contenido: ${categorias.length} categorías, ${marcas.length} marcas, ${productos.length} productos, ${imagenes.length} imágenes.
-- Un solo bloque DO = una sola transacción: TODO o NADA. Sin UPDATE ni DELETE.
-- No toca esquema, RLS, Auth ni Storage.
-- =====================================================================
do ${TAG}
declare
  n_cat int; n_mar int; n_pro int; n_img int;
begin
  -- 1. Estado esperado: las cuatro tablas vacías
  select count(*) into n_cat from public.categories;
  select count(*) into n_mar from public.brands;
  select count(*) into n_pro from public.products;
  select count(*) into n_img from public.product_images;
  if n_cat <> 0 or n_mar <> 0 or n_pro <> 0 or n_img <> 0 then
    raise exception 'Estado inesperado del remoto (categories=%, brands=%, products=%, product_images=%): se esperaba todo vacío. No se escribió nada.',
      n_cat, n_mar, n_pro, n_img;
  end if;

  -- 2. Categorías
  insert into public.categories (name, slug) values
${filas(categorias, c => `${lit(c.name)}, ${lit(c.slug)}`)};

  -- 3. Marcas
  insert into public.brands (name, slug) values
${filas(marcas, m => `${lit(m.name)}, ${lit(m.slug)}`)};

  -- 4. Productos (marca y categoría se resuelven por nombre exacto)
  insert into public.products
    (legacy_id, slug, name, brand_id, category_id, short_description, description,
     price, compare_at_price, badge, is_featured, is_published)
  select v.legacy_id, v.slug, v.name, b.id, c.id, v.short_description, v.description,
         v.price, v.compare_at_price, v.badge, v.is_featured, v.is_published
  from (values
${filas(productos, p => [p.legacy_id, lit(p.slug), lit(p.name), lit(p.brand), lit(p.category), lit(p.short_description), lit(p.description),
    num2(p.price), num2(p.compare_at_price), lit(p.badge), lit(p.is_featured), lit(p.is_published)].join(', '))}
  ) as v (legacy_id, slug, name, brand, category, short_description, description,
          price, compare_at_price, badge, is_featured, is_published)
  join public.brands b     on b.name = v.brand
  join public.categories c on c.name = v.category;

  -- 5. Imágenes (solo external_url; storage_path queda NULL; position = orden del JSON)
  insert into public.product_images (product_id, position, external_url)
  select p.id, v.position, v.external_url
  from (values
${filas(imagenes, i => `${i.legacy_id}, ${i.position}, ${lit(i.external_url)}`)}
  ) as v (legacy_id, position, external_url)
  join public.products p on p.legacy_id = v.legacy_id;

  -- 6. Verificación final: si algo no cuadra, se deshace TODO
  select count(*) into n_cat from public.categories;
  select count(*) into n_mar from public.brands;
  select count(*) into n_pro from public.products;
  select count(*) into n_img from public.product_images;
  if n_cat <> ${categorias.length} or n_mar <> ${marcas.length} or n_pro <> ${productos.length} or n_img <> ${imagenes.length} then
    raise exception 'Conteos finales inesperados (categories=%, brands=%, products=%, product_images=%). Se deshace todo.',
      n_cat, n_mar, n_pro, n_img;
  end if;
  if exists (select 1 from public.products where legacy_id not between 1 and ${productos.length} or not is_published) then
    raise exception 'Productos con legacy_id fuera de rango o sin publicar. Se deshace todo.';
  end if;
  if exists (select 1 from public.product_images where storage_path is not null or external_url is null) then
    raise exception 'Imágenes con storage_path o sin external_url. Se deshace todo.';
  end if;
  raise notice 'Catálogo cargado: % categorías, % marcas, % productos, % imágenes', n_cat, n_mar, n_pro, n_img;
end
${TAG};
`;

const dir = resolve(RAIZ, 'scripts/catalogo/generado');
mkdirSync(dir, { recursive: true });
const destino = resolve(dir, 'catalogo-inicial.sql');
writeFileSync(destino, sql, 'utf8');
console.log(`SQL generado: ${destino}`);
console.log(`Categorías ${categorias.length} | Marcas ${marcas.length} | Productos ${productos.length} | Imágenes ${imagenes.length} | Total ${categorias.length + marcas.length + productos.length + imagenes.length}`);
