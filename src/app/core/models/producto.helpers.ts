import { Disponibilidad, Especificacion, Producto } from './producto.model';

// ------------------------------------------------------------------
// Slugs
// ------------------------------------------------------------------

const SLUG_MAX = 80;
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Convierte un texto en slug: "Refrigeradora LG 16 Pies³" → "refrigeradora-lg-16-pies" */
export function slugify(texto: string): string {
  const slug = texto
    .replace(/[³²"]/g, '')                       // Pies³, 65" → sin símbolos
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita tildes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length <= SLUG_MAX) return slug;
  const corte = slug.slice(0, SLUG_MAX);
  return corte.slice(0, corte.lastIndexOf('-') > 0 ? corte.lastIndexOf('-') : SLUG_MAX);
}

/** Slug a partir de los datos del producto; añade la marca si el nombre no la incluye. */
export function slugDesdeProducto(nombre: string, marca: string): string {
  const base = slugify(nombre);
  const marcaSlug = slugify(marca);
  return marcaSlug && !base.split('-').includes(marcaSlug) ? `${base}-${marcaSlug}` : base;
}

/** Ruta interna para routerLink */
export function rutaProducto(p: Pick<Producto, 'slug'>): string[] {
  return ['/producto', p.slug];
}

/**
 * URL absoluta del producto, basada en el <base href> del documento.
 * No depende del dominio: funciona en localhost, Vercel o el dominio definitivo.
 */
export function urlAbsolutaProducto(baseURI: string, p: Pick<Producto, 'slug'>): string {
  return new URL('producto/' + encodeURIComponent(p.slug), baseURI).toString();
}

// ------------------------------------------------------------------
// Precio
// ------------------------------------------------------------------

export function tieneDescuento(p: Producto): boolean {
  return p.precioOriginal !== undefined && p.precioOriginal > p.precio;
}

export function ahorro(p: Producto): number {
  return tieneDescuento(p) ? p.precioOriginal! - p.precio : 0;
}

/** Porcentaje de descuento redondeado (0 si no aplica) */
export function porcentajeDescuento(p: Producto): number {
  return tieneDescuento(p) ? Math.round((ahorro(p) / p.precioOriginal!) * 100) : 0;
}

/** Formato de precio consistente con las tarjetas: $1,234.00 */
export function formatoPrecio(valor: number): string {
  return '$' + valor.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ------------------------------------------------------------------
// Ficha técnica (solo datos existentes, sin filas vacías)
// ------------------------------------------------------------------

function filas(pares: [string, string | undefined][]): Especificacion[] {
  return pares
    .filter((par): par is [string, string] => typeof par[1] === 'string' && par[1].trim() !== '')
    .map(([label, value]) => ({ label, value: value.trim() }));
}

/** Atributos principales para el resumen de la ficha */
export function caracteristicasPrincipales(p: Producto): Especificacion[] {
  return filas([
    ['Capacidad', p.capacidad],
    ['Potencia', p.potencia],
    ['Voltaje', p.voltaje],
    ['Color', p.color]
  ]);
}

/** Tabla completa: datos fijos del producto + especificaciones flexibles */
export function especificacionesCompletas(p: Producto): Especificacion[] {
  const base = filas([
    ['Marca', p.marca],
    ['Modelo', p.modelo],
    ['SKU', p.sku],
    ['Categoría', p.categoria],
    ['Capacidad', p.capacidad],
    ['Potencia', p.potencia],
    ['Voltaje', p.voltaje],
    ['Color', p.color],
    ['Garantía', p.garantia]
  ]);
  const usadas = new Set(base.map(e => e.label.toLowerCase()));
  const extra = filas(p.especificaciones.map(e => [e.label, e.value] as [string, string]))
    .filter(e => e.label !== '' && !usadas.has(e.label.toLowerCase()));
  return [...base, ...extra];
}

export interface Medida {
  label: string;
  valor: string;
  icono: string;
}

/** Mismo formato numérico que los precios del sitio (punto decimal): 91.2 */
function formatoNumero(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/** Medidas existentes (cm / kg) */
export function medidas(p: Producto): Medida[] {
  const lista: Medida[] = [];
  const ok = (n: number | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;
  if (ok(p.ancho)) lista.push({ label: 'Ancho', valor: `${formatoNumero(p.ancho)} cm`, icono: 'fas fa-arrows-left-right' });
  if (ok(p.alto)) lista.push({ label: 'Alto', valor: `${formatoNumero(p.alto)} cm`, icono: 'fas fa-arrows-up-down' });
  if (ok(p.profundidad)) lista.push({ label: 'Profundidad', valor: `${formatoNumero(p.profundidad)} cm`, icono: 'fas fa-cube' });
  if (ok(p.peso)) lista.push({ label: 'Peso', valor: `${formatoNumero(p.peso)} kg`, icono: 'fas fa-weight-hanging' });
  return lista;
}

// ------------------------------------------------------------------
// Disponibilidad
// ------------------------------------------------------------------

export const DISPONIBILIDAD_INFO: Record<Disponibilidad, { texto: string; clase: string; icono: string }> = {
  disponible: { texto: 'Disponible', clase: 'text-green-700 bg-green-50', icono: 'fas fa-circle-check' },
  pocas_unidades: { texto: 'Pocas unidades', clase: 'text-amber-700 bg-amber-50', icono: 'fas fa-triangle-exclamation' },
  bajo_pedido: { texto: 'Bajo pedido', clase: 'text-blue-700 bg-blue-50', icono: 'fas fa-truck' },
  agotado: { texto: 'Agotado', clase: 'text-gray-600 bg-gray-100', icono: 'fas fa-circle-xmark' }
};
