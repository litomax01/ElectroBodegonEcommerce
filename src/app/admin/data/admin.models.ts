/** Tipos del panel de administración (reflejan public.products & co. del esquema). */

export interface ImagenAdmin {
  id: string;
  product_id: string;
  storage_path: string | null;
  external_url: string | null;
  alt_text: string | null;
  position: number;
}

export interface OpcionCatalogo {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

export interface EspecificacionAdmin {
  label: string;
  value: string;
}

export type DisponibilidadDb = 'in_stock' | 'low_stock' | 'backorder' | 'out_of_stock';

export const DISPONIBILIDADES: { valor: DisponibilidadDb; texto: string }[] = [
  { valor: 'in_stock', texto: 'Disponible' },
  { valor: 'low_stock', texto: 'Pocas unidades' },
  { valor: 'backorder', texto: 'Bajo pedido' },
  { valor: 'out_of_stock', texto: 'Agotado' }
];

/** Fila completa de products (más marca, categoría e imágenes embebidas). */
export interface ProductoAdminRow {
  id: string;
  legacy_id: number | null;
  slug: string;
  name: string;
  brand_id: string;
  category_id: string;
  model: string | null;
  sku: string | null;
  short_description: string | null;
  description: string | null;
  price: number | string;
  compare_at_price: number | string | null;
  badge: string | null;
  is_featured: boolean;
  is_published: boolean;
  availability: DisponibilidadDb | null;
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
  specifications: EspecificacionAdmin[] | null;
  created_at: string;
  updated_at: string;
  brand: { name: string } | null;
  category: { name: string } | null;
  images: ImagenAdmin[] | null;
}

/** Campos editables de un producto (lo que se envía a Supabase). */
export interface ProductoPayload {
  slug: string;
  name: string;
  brand_id: string;
  category_id: string;
  model: string | null;
  sku: string | null;
  short_description: string | null;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  badge: string | null;
  is_featured: boolean;
  is_published: boolean;
  availability: DisponibilidadDb | null;
  stock: number | null;
  color: string | null;
  capacity: string | null;
  power: string | null;
  voltage: string | null;
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;
  weight_kg: number | null;
  warranty: string | null;
  specifications: EspecificacionAdmin[];
}

export type EstadoFiltro = 'todos' | 'publicados' | 'ocultos';

export interface FiltrosProductos {
  q: string;
  categoriaId: string;
  marcaId: string;
  estado: EstadoFiltro;
  destacado: boolean;
  pagina: number; // base 1
  porPagina: number;
}

export interface PaginaProductos {
  filas: ProductoAdminRow[];
  total: number;
}

export interface ResumenCatalogo {
  total: number;
  publicados: number;
  ocultos: number;
  destacados: number;
  categorias: number;
  marcas: number;
}

export const TIPOS_IMAGEN_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const TAMANO_MAX_IMAGEN = 5 * 1024 * 1024; // 5 MB (límite del bucket)
