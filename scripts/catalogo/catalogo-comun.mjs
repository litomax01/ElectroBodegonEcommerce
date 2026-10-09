/**
 * Lógica compartida de la migración del catálogo (productos.json → Supabase).
 * Solo Node; sin dependencias. No escribe nada: construye y valida el plan.
 *
 * Regla: se conserva EXACTAMENTE lo que hay en productos.json. Nada se inventa:
 * los campos que el JSON no trae (sku, modelo, medidas, stock, garantía,
 * disponibilidad, especificaciones...) quedan en NULL / valor por defecto del esquema.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const RUTA_JSON = resolve(RAIZ, 'public/assets/data/productos.json');
export const TOTAL_ESPERADO = 55;

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Mismo criterio que core/models/producto.helpers.ts#slugify (solo para categorías y marcas). */
export function slugify(texto) {
  return texto
    .replace(/["³²]/g, '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const texto = v => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);
const numero = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function leerProductosJson(ruta = RUTA_JSON) {
  return JSON.parse(readFileSync(ruta, 'utf8'));
}

/**
 * Construye el plan de migración a partir del JSON.
 * Devuelve { categorias, marcas, productos, imagenes, errores, advertencias }.
 * Si `errores` no está vacío NO se debe escribir nada.
 */
export function construirPlan(json) {
  const errores = [];
  const advertencias = [];
  const err = m => errores.push(m);
  const adv = m => advertencias.push(m);

  if (!Array.isArray(json)) {
    err('productos.json no es un arreglo');
    return { categorias: [], marcas: [], productos: [], imagenes: [], errores, advertencias };
  }
  if (json.length !== TOTAL_ESPERADO) err(`Se esperaban ${TOTAL_ESPERADO} productos y hay ${json.length}`);

  // --- unicidad de legacy_id y slug ---
  const ids = new Set();
  const slugs = new Set();
  const nombres = new Set();

  // --- categorías y marcas (únicas por nombre exacto, orden de primera aparición) ---
  const catPorNombre = new Map();
  const marcaPorNombre = new Map();
  const registrar = (mapa, nombre, tipo) => {
    if (!mapa.has(nombre)) mapa.set(nombre, { name: nombre, slug: slugify(nombre) });
    return mapa.get(nombre);
  };

  const productos = [];
  const imagenes = [];

  for (const raw of json) {
    const etiqueta = `producto id=${raw?.id}`;
    const legacy = raw?.id;
    if (!Number.isInteger(legacy) || legacy < 1) { err(`${etiqueta}: id no es un entero positivo`); continue; }
    if (ids.has(legacy)) err(`${etiqueta}: legacy_id duplicado`);
    ids.add(legacy);

    const slug = texto(raw.slug);
    if (!slug) err(`${etiqueta}: sin slug (no se inventa uno)`);
    else if (!SLUG_REGEX.test(slug) || slug.length > 120) err(`${etiqueta}: slug inválido "${slug}"`);
    else if (slugs.has(slug)) err(`${etiqueta}: slug duplicado "${slug}"`);
    if (slug) slugs.add(slug);

    const nombre = texto(raw.nombre);
    if (!nombre || nombre.length > 200) err(`${etiqueta}: nombre vacío o >200 caracteres`);
    else if (nombres.has(nombre.toLowerCase())) adv(`${etiqueta}: nombre repetido "${nombre}"`);
    if (nombre) nombres.add(nombre.toLowerCase());

    const marca = texto(raw.marca);
    const categoria = texto(raw.categoria);
    if (!marca) err(`${etiqueta}: sin marca`);
    if (!categoria) err(`${etiqueta}: sin categoría`);
    if (marca) registrar(marcaPorNombre, marca);
    if (categoria) registrar(catPorNombre, categoria);

    const precio = numero(raw.precio_oferta);
    const original = raw.precio_original === undefined ? null : numero(raw.precio_original);
    if (precio === null || precio < 0) err(`${etiqueta}: precio_oferta inválido`);
    if (raw.precio_original !== undefined && original === null) err(`${etiqueta}: precio_original inválido`);
    if (original !== null && precio !== null && !(original > precio)) {
      err(`${etiqueta}: precio_original (${original}) no es mayor que precio_oferta (${precio}); el esquema lo rechaza`);
    }

    const corta = texto(raw.descripcion);
    if (corta && corta.length > 300) err(`${etiqueta}: descripcion >300 caracteres`);
    const larga = texto(raw.descripcion_larga);
    const badge = texto(raw.etiqueta);
    if (badge && badge.length > 30) err(`${etiqueta}: etiqueta >30 caracteres`);
    if (badge && original !== null && precio !== null) {
      const esperado = `-${Math.round((1 - precio / original) * 100)}%`;
      if (/^-\d+%$/.test(badge) && badge !== esperado) {
        adv(`${etiqueta}: etiqueta "${badge}" no coincide con el descuento calculado (${esperado}); se conserva "${badge}"`);
      }
    }

    // Imágenes: mismo criterio que el mapper del JSON (imagenes[] si existe, si no imagen_url)
    const fuentes = Array.isArray(raw.imagenes) && raw.imagenes.length ? raw.imagenes : raw.imagen_url ? [raw.imagen_url] : [];
    if (fuentes.length === 0) adv(`${etiqueta}: sin imágenes`);
    fuentes.forEach((f, pos) => {
      const url = typeof f === 'string' ? f.trim() : texto(f?.url);
      if (!url || !/^https:\/\/\S+$/.test(url) || url.length > 2048) {
        err(`${etiqueta}: imagen #${pos} no es una URL https válida (el esquema solo admite https)`);
        return;
      }
      imagenes.push({ legacy_id: legacy, position: pos, external_url: url });
    });

    // Hoy el JSON no trae estos campos; si aparecieran, este script no los migra: abortar
    // en vez de perderlos en silencio.
    for (const k of ['modelo', 'sku', 'disponibilidad', 'stock', 'garantia', 'especificaciones', 'sucursales', 'color', 'capacidad', 'potencia', 'voltaje', 'ancho', 'alto', 'profundidad', 'peso', 'imagen_dimensiones']) {
      if (raw[k] !== undefined) err(`${etiqueta}: trae "${k}", que este script no migra; ampliar el script antes de ejecutar`);
    }

    productos.push({
      legacy_id: legacy,
      slug,
      name: nombre,
      brand: marca,
      category: categoria,
      short_description: corta,
      description: larga,
      price: precio,
      compare_at_price: original,
      badge,
      is_featured: raw.destacado === true,
      // Hoy todos los productos del JSON son visibles en el sitio (publicado !== false).
      is_published: raw.publicado !== false
    });
  }

  // colisiones de slug entre nombres distintos
  for (const [mapa, tipo] of [[catPorNombre, 'categoría'], [marcaPorNombre, 'marca']]) {
    const vistos = new Map();
    for (const e of mapa.values()) {
      if (!SLUG_REGEX.test(e.slug)) err(`${tipo} "${e.name}": slug inválido "${e.slug}"`);
      if (vistos.has(e.slug)) err(`${tipo}: "${e.name}" y "${vistos.get(e.slug)}" generan el mismo slug "${e.slug}"`);
      vistos.set(e.slug, e.name);
    }
  }
  const cabeceras = new Map();
  for (const m of [...marcaPorNombre.keys(), ...catPorNombre.keys()]) {
    const k = m.toLowerCase();
    if (cabeceras.has(k)) err(`Nombre repetido sin distinguir mayúsculas: "${m}"`);
    cabeceras.set(k, m);
  }

  // imágenes compartidas entre productos (informativo)
  const porUrl = new Map();
  for (const i of imagenes) porUrl.set(i.external_url, (porUrl.get(i.external_url) ?? 0) + 1);
  const compartidas = [...porUrl.values()].filter(n => n > 1).length;
  if (compartidas) adv(`${compartidas} URLs de imagen se repiten en varios productos (imágenes genéricas actuales; se conservan tal cual)`);

  return {
    categorias: [...catPorNombre.values()],
    marcas: [...marcaPorNombre.values()],
    productos,
    imagenes,
    errores,
    advertencias
  };
}

// ---------------------------------------------------------------------
// Comparación JSON vs filas de Supabase (usada por el verificador)
// ---------------------------------------------------------------------

const num = v => (v === null || v === undefined || v === '' ? null : Number(v));

/**
 * Compara un producto del plan (derivado del JSON) con una fila de Supabase
 * (con brand, category e images embebidos). Devuelve la lista de diferencias.
 */
export function compararProducto(esperado, fila, imagenesEsperadas) {
  const d = [];
  const cmp = (campo, a, b) => { if (a !== b) d.push(`${campo}: JSON=${JSON.stringify(a)} Supabase=${JSON.stringify(b)}`); };
  cmp('legacy_id', esperado.legacy_id, fila.legacy_id);
  cmp('slug', esperado.slug, fila.slug);
  cmp('nombre', esperado.name, fila.name);
  cmp('precio', esperado.price, num(fila.price));
  cmp('precio original', esperado.compare_at_price, num(fila.compare_at_price));
  cmp('marca', esperado.brand, fila.brand?.name ?? null);
  cmp('categoría', esperado.category, fila.category?.name ?? null);
  cmp('destacado', esperado.is_featured, fila.is_featured);
  cmp('publicado', esperado.is_published, fila.is_published);
  cmp('etiqueta', esperado.badge, fila.badge ?? null);
  cmp('descripción corta', esperado.short_description, fila.short_description ?? null);
  cmp('descripción larga', esperado.description, fila.description ?? null);

  const imgs = [...(fila.images ?? [])].sort((a, b) => a.position - b.position);
  cmp('n.º de imágenes', imagenesEsperadas.length, imgs.length);
  imagenesEsperadas.forEach((e, i) => {
    const r = imgs[i];
    if (!r) return;
    cmp(`imagen[${i}] posición`, e.position, r.position);
    cmp(`imagen[${i}] URL`, e.external_url, r.external_url ?? null);
    if (r.storage_path) d.push(`imagen[${i}]: tiene storage_path (se esperaba solo external_url)`);
  });
  return d;
}
