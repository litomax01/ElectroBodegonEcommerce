/**
 * Modelo de dominio de Producto.
 * Es independiente de la fuente de datos: el JSON actual y el futuro Supabase
 * se convierten a este formato en su repositorio (ver data/repositories).
 *
 * Regla: los campos opcionales se dejan vacíos si no existe el dato real.
 * La interfaz solo muestra lo que existe; nunca se rellena con valores inventados.
 */

export type ProductoId = number | string;

export interface ProductoImagen {
  /** URL http(s) o ruta relativa. En Fase 2: URL pública de Supabase Storage. */
  url: string;
  alt?: string;
  /** Dimensiones intrínsecas, si se conocen (evitan saltos de diseño). */
  width?: number;
  height?: number;
}

/** Especificación técnica flexible; sirve para cualquier categoría. */
export interface Especificacion {
  label: string;
  value: string;
}

export type Disponibilidad = 'disponible' | 'pocas_unidades' | 'bajo_pedido' | 'agotado';

export interface Producto {
  id: ProductoId;
  /** Identificador legible para la URL (/producto/:slug). Único. */
  slug: string;
  nombre: string;
  marca: string;
  categoria: string;
  modelo?: string;
  sku?: string;

  descripcionCorta?: string;
  descripcion?: string;

  /** Precio de venta actual */
  precio: number;
  /** Precio anterior; solo se muestra si es mayor que `precio` */
  precioOriginal?: number;
  enOferta: boolean;
  destacado: boolean;
  /** Texto corto del distintivo (ej. "-18%", "Nuevo") */
  etiqueta?: string;

  disponibilidad?: Disponibilidad;
  stock?: number;

  color?: string;
  capacidad?: string;
  potencia?: string;
  voltaje?: string;

  /** Medidas en centímetros */
  ancho?: number;
  alto?: number;
  profundidad?: number;
  /** Peso en kilogramos */
  peso?: number;

  garantia?: string;

  /** Primera imagen = principal. Puede estar vacío. */
  imagenes: ProductoImagen[];
  /** Imagen técnica con las medidas del producto */
  imagenDimensiones?: ProductoImagen;

  especificaciones: Especificacion[];

  publicado: boolean;

  /** Sucursales donde se ofrece (ids de STORE_CONFIG.sucursales). Vacío = todas. */
  sucursalIds?: string[];
}
