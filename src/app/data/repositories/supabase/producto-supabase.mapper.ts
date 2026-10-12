import { Disponibilidad, Especificacion, Producto, ProductoImagen } from '../../../core/models/producto.model';
import { resolverFoto } from '../../../core/models/fotos-no-corresponden';

/** Bucket de Storage con las imágenes del catálogo (ver migración inicial). */
export const BUCKET_CATALOGO = 'catalog-media';

/** Columnas que se piden a PostgREST (una sola consulta con marca, categoría e imágenes). */
export const SELECT_PRODUCTO = `
  id, legacy_id, slug, name, model, sku, short_description, description,
  price, compare_at_price, badge, is_featured, is_published, availability, stock,
  color, capacity, power, voltage, width_cm, height_cm, depth_cm, weight_kg,
  warranty, dimensions_image_path, specifications,
  brand:brands ( name ),
  category:categories ( name ),
  images:product_images ( storage_path, external_url, alt_text, width, height, position )
`;

interface ImagenRow {
  storage_path: string | null;
  external_url: string | null;
  alt_text: string | null;
  width: number | null;
  height: number | null;
  position: number;
}

/** Fila de public.products tal como la devuelve SELECT_PRODUCTO. */
export interface ProductoRow {
  id: string;
  legacy_id: number | null;
  slug: string;
  name: string;
  model: string | null;
  sku: string | null;
  short_description: string | null;
  description: string | null;
  price: number | string;              // numeric puede llegar como texto
  compare_at_price: number | string | null;
  badge: string | null;
  is_featured: boolean;
  is_published: boolean;
  availability: string | null;
  stock: number | null;
  color: string | null;
  capacity: string | null;
  power: string | null;
  voltage: string | null;
  width_cm: number | string | null;
  height_cm: number | string | null;
  depth_cm: number | string | null;
  weight_kg: number | string | null;
  warranty: string | null;
  dimensions_image_path: string | null;
  specifications: unknown;
  brand: { name: string } | null;      // null si la marca está inactiva (RLS)
  category: { name: string } | null;
  images: ImagenRow[] | null;
}

/** Convierte una ruta de Storage en URL pública (la base de datos guarda la ruta, no la URL). */
export type ResolverUrlPublica = (path: string) => string;

const DISPONIBILIDAD: Record<string, Disponibilidad> = {
  in_stock: 'disponible',
  low_stock: 'pocas_unidades',
  backorder: 'bajo_pedido',
  out_of_stock: 'agotado'
};

function num(v: number | string | null | undefined): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function txt(v: string | null | undefined): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
}

function especificaciones(v: unknown): Especificacion[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (e): e is Especificacion =>
      !!e && typeof e.label === 'string' && typeof e.value === 'string' && e.label.trim() !== '' && e.value.trim() !== ''
  );
}

function imagen(row: ImagenRow, alt: string, urlPublica: ResolverUrlPublica): ProductoImagen | null {
  const url = row.storage_path ? urlPublica(row.storage_path) : row.external_url;
  if (!url) return null;
  return {
    url,
    alt: txt(row.alt_text) ?? alt,
    width: row.width ?? undefined,
    height: row.height ?? undefined
  };
}

export function mapProductoRow(row: ProductoRow, urlPublica: ResolverUrlPublica): Producto {
  const nombre = row.name.trim();
  const precio = num(row.price) ?? 0;
  const precioOriginal = num(row.compare_at_price);

  const imagenes = [...(row.images ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((img, i) => imagen(img, i === 0 ? nombre : `${nombre} — imagen ${i + 1}`, urlPublica))
    .filter((img): img is ProductoImagen => img !== null)
    .map(img => ({ ...img, url: resolverFoto(img.url, nombre) }))
    .filter((img): img is ProductoImagen => img.url !== null);

  return {
    id: row.id,
    slug: row.slug,
    nombre,
    marca: row.brand?.name ?? '',
    categoria: row.category?.name ?? '',
    modelo: txt(row.model),
    sku: txt(row.sku),
    descripcionCorta: txt(row.short_description),
    descripcion: txt(row.description),
    precio,
    precioOriginal,
    enOferta: precioOriginal !== undefined && precioOriginal > precio,
    destacado: row.is_featured,
    etiqueta: txt(row.badge),
    disponibilidad: row.availability ? DISPONIBILIDAD[row.availability] : undefined,
    stock: row.stock ?? undefined,
    color: txt(row.color),
    capacidad: txt(row.capacity),
    potencia: txt(row.power),
    voltaje: txt(row.voltage),
    ancho: num(row.width_cm),
    alto: num(row.height_cm),
    profundidad: num(row.depth_cm),
    peso: num(row.weight_kg),
    garantia: txt(row.warranty),
    imagenes,
    imagenDimensiones: row.dimensions_image_path
      ? { url: urlPublica(row.dimensions_image_path), alt: `Dimensiones de ${nombre}` }
      : undefined,
    especificaciones: especificaciones(row.specifications),
    publicado: row.is_published
  };
}
