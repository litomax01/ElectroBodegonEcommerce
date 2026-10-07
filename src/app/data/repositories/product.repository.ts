import { Observable } from 'rxjs';
import { Producto, ProductoId } from '../../core/models/producto.model';

/**
 * Contrato de acceso a productos. La UI solo conoce esta clase.
 *
 * Implementación actual: JsonProductRepository (assets/data/productos.json).
 * Fase 2: SupabaseProductRepository — se cambia el provider en app.config.ts
 * y ningún componente necesita modificarse.
 *
 * Todos los métodos devuelven únicamente productos publicados.
 */
export abstract class ProductRepository {
  abstract getAll(): Observable<Producto[]>;

  /** `null` si no existe o no está publicado */
  abstract getBySlug(slug: string): Observable<Producto | null>;

  /** `null` si no existe o no está publicado */
  abstract getById(id: ProductoId): Observable<Producto | null>;

  abstract getFeatured(limit?: number): Observable<Producto[]>;

  /** Misma categoría primero, luego misma marca; nunca incluye el producto dado */
  abstract getRelated(producto: Producto, limit?: number): Observable<Producto[]>;
}
