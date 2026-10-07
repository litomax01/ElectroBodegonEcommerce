import { Disponibilidad, Especificacion, Producto, ProductoImagen } from '../../../core/models/producto.model';
import { SLUG_REGEX, slugDesdeProducto } from '../../../core/models/producto.helpers';

/**
 * Formato del archivo productos.json.
 * Campos heredados en snake_case + campos nuevos opcionales (para enriquecer el
 * JSON gradualmente antes de migrar a Supabase).
 */
export interface ProductoJson {
  id: number | string;
  slug?: string;
  nombre: string;
  marca: string;
  categoria: string;
  precio_original?: number;
  precio_oferta: number;
  imagen_url?: string;
  etiqueta?: string;
  destacado?: boolean;
  descripcion?: string;
  // ---- opcionales nuevos ----
  modelo?: string;
  sku?: string;
  descripcion_larga?: string;
  disponibilidad?: string;
  stock?: number;
  color?: string;
  capacidad?: string;
  potencia?: string;
  voltaje?: string;
  ancho?: number;
  alto?: number;
  profundidad?: number;
  peso?: number;
  garantia?: string;
  imagenes?: (string | ProductoImagen)[];
  imagen_dimensiones?: string;
  especificaciones?: Especificacion[];
  publicado?: boolean;
  sucursales?: string[];
}

const DISPONIBILIDADES: Disponibilidad[] = ['disponible', 'pocas_unidades', 'bajo_pedido', 'agotado'];

/** Solo http(s) o rutas relativas; cualquier otro esquema se descarta. */
export function esUrlImagenValida(url: unknown): url is string {
  if (typeof url !== 'string' || url.trim() === '') return false;
  const u = url.trim();
  if (/^https?:\/\//i.test(u)) return true;
  return !/^[a-z][a-z0-9+.-]*:/i.test(u) && !u.startsWith('//');
}

function texto(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
}

function numero(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function imagen(v: string | ProductoImagen, alt: string): ProductoImagen | null {
  if (typeof v === 'string') return esUrlImagenValida(v) ? { url: v.trim(), alt } : null;
  return v && esUrlImagenValida(v.url) ? { ...v, url: v.url.trim(), alt: v.alt ?? alt } : null;
}

export function mapProductoJson(raw: ProductoJson): Producto {
  const nombre = raw.nombre.trim();
  const precio = raw.precio_oferta;
  const precioOriginal = numero(raw.precio_original);

  const fuentesImagen = raw.imagenes?.length ? raw.imagenes : raw.imagen_url ? [raw.imagen_url] : [];
  const imagenes = fuentesImagen
    .map((img, i) => imagen(img, i === 0 ? nombre : `${nombre} — imagen ${i + 1}`))
    .filter((img): img is ProductoImagen => img !== null);

  const slugGuardado = texto(raw.slug)?.toLowerCase();
  const disponibilidad = DISPONIBILIDADES.find(d => d === raw.disponibilidad);
  const imgDim = raw.imagen_dimensiones ? imagen(raw.imagen_dimensiones, `Dimensiones de ${nombre}`) : null;

  return {
    id: raw.id,
    slug: slugGuardado && SLUG_REGEX.test(slugGuardado) ? slugGuardado : slugDesdeProducto(nombre, raw.marca),
    nombre,
    marca: raw.marca,
    categoria: raw.categoria,
    modelo: texto(raw.modelo),
    sku: texto(raw.sku),
    // El JSON heredado solo tiene una frase corta en "descripcion"
    descripcionCorta: texto(raw.descripcion),
    descripcion: texto(raw.descripcion_larga),
    precio,
    precioOriginal,
    enOferta: precioOriginal !== undefined && precioOriginal > precio,
    destacado: raw.destacado === true,
    etiqueta: texto(raw.etiqueta),
    disponibilidad,
    stock: numero(raw.stock),
    color: texto(raw.color),
    capacidad: texto(raw.capacidad),
    potencia: texto(raw.potencia),
    voltaje: texto(raw.voltaje),
    ancho: numero(raw.ancho),
    alto: numero(raw.alto),
    profundidad: numero(raw.profundidad),
    peso: numero(raw.peso),
    garantia: texto(raw.garantia),
    imagenes,
    imagenDimensiones: imgDim ?? undefined,
    especificaciones: (raw.especificaciones ?? []).filter(
      e => e && texto(e.label) !== undefined && texto(e.value) !== undefined
    ),
    publicado: raw.publicado !== false,
    sucursalIds: raw.sucursales
  };
}
