#!/usr/bin/env node
/**
 * Verificación JSON vs Supabase (solo lectura, clave pública).
 *
 *   node scripts/catalogo/verificar-catalogo.mjs            # compara contra el remoto
 *   node scripts/catalogo/verificar-catalogo.mjs --autotest # prueba la lógica de comparación sin red
 *
 * Compara por producto: legacy_id, slug, nombre, precio, precio original, marca,
 * categoría, destacado, publicado, etiqueta, descripciones, nº de imágenes, URLs y orden.
 * Con la clave pública solo se ven filas publicadas (RLS); si todo el catálogo está
 * publicado, la comparación es completa. Código de salida 0 = 55/55 sin diferencias.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { RAIZ, compararProducto, construirPlan, leerProductosJson } from './catalogo-comun.mjs';

const autotest = process.argv.includes('--autotest');
const plan = construirPlan(leerProductosJson());
if (plan.errores.length) {
  plan.errores.forEach(e => console.log(`ERROR: ${e}`));
  console.error('productos.json no es válido; no se puede comparar.');
  process.exit(1);
}

const imgsDe = id => plan.imagenes.filter(i => i.legacy_id === id);

let filas;
if (autotest) {
  // Simula lo que devolvería Supabase si la migración fuera perfecta.
  filas = plan.productos.map(p => ({
    legacy_id: p.legacy_id, slug: p.slug, name: p.name, price: String(p.price.toFixed(2)),
    compare_at_price: p.compare_at_price === null ? null : p.compare_at_price.toFixed(2),
    brand: { name: p.brand }, category: { name: p.category },
    is_featured: p.is_featured, is_published: p.is_published, badge: p.badge,
    short_description: p.short_description, description: p.description,
    images: imgsDe(p.legacy_id).map(i => ({ position: i.position, external_url: i.external_url, storage_path: null }))
  }));
  // y comprueba que detecta una diferencia
  const roto = structuredClone(filas[0]); roto.price = '1.00';
  if (compararProducto(plan.productos[0], roto, imgsDe(plan.productos[0].legacy_id)).length === 0) {
    console.error('AUTOTEST FALLIDO: no detectó una diferencia de precio'); process.exit(1);
  }
} else {
  const env = {};
  const ruta = resolve(RAIZ, '.env');
  if (existsSync(ruta)) for (const l of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*(SUPABASE_URL|SUPABASE_PUBLISHABLE_KEY|SUPABASE_ANON_KEY)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  const url = process.env.SUPABASE_URL ?? env.SUPABASE_URL;
  const clave = process.env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY;
  if (!url || !clave) { console.error('Faltan SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY'); process.exit(1); }
  const cliente = createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await cliente.from('products').select(`
    legacy_id, slug, name, price, compare_at_price, badge, is_featured, is_published,
    short_description, description,
    brand:brands ( name ), category:categories ( name ),
    images:product_images ( position, external_url, storage_path )`).order('legacy_id').limit(5000);
  if (error) { console.error(`Error leyendo Supabase: ${error.message}`); process.exit(1); }
  filas = data;
}

const porLegacy = new Map(filas.map(f => [f.legacy_id, f]));
let coinciden = 0, conDiferencias = 0;
for (const esperado of plan.productos) {
  const fila = porLegacy.get(esperado.legacy_id);
  const dif = fila ? compararProducto(esperado, fila, imgsDe(esperado.legacy_id)) : ['no existe en Supabase'];
  if (dif.length === 0) { coinciden++; console.log(`OK    #${String(esperado.legacy_id).padStart(2)} ${esperado.slug}`); }
  else { conDiferencias++; console.log(`DIFF  #${String(esperado.legacy_id).padStart(2)} ${esperado.slug}`); dif.forEach(d => console.log(`        - ${d}`)); }
}
const sobrantes = filas.filter(f => !plan.productos.some(p => p.legacy_id === f.legacy_id));
sobrantes.forEach(f => console.log(`EXTRA legacy_id=${f.legacy_id} slug=${f.slug} (no está en el JSON)`));

console.log(`\n${autotest ? '[AUTOTEST sin red] ' : ''}Resumen`);
console.log(`Productos JSON: ${plan.productos.length}`);
console.log(`Productos Supabase: ${filas.length}`);
console.log(`Coincidencias completas: ${coinciden}`);
console.log(`Diferencias: ${conDiferencias + sobrantes.length}`);
process.exit(conDiferencias === 0 && sobrantes.length === 0 && coinciden === plan.productos.length ? 0 : 2);
