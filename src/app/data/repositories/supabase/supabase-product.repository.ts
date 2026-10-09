import { Injectable, inject } from '@angular/core';
import { Observable, defer, map, of, shareReplay } from 'rxjs';
import { Producto, ProductoId } from '../../../core/models/producto.model';
import { SupabaseRestService } from '../../../core/supabase/supabase-rest.service';
import { ProductRepository } from '../product.repository';
import { BUCKET_CATALOGO, ProductoRow, SELECT_PRODUCTO, mapProductoRow } from './producto-supabase.mapper';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Productos desde Supabase (tabla public.products + marca, categoría e imágenes).
 *
 * Es la fuente ACTIVA del catálogo (provider en app.config.ts).
 *
 * - Lee por la API REST pública con HttpClient (ver SupabaseRestService): Angular espera la
 *   respuesta durante el SSR y la reutiliza en el navegador.
 * - Siempre filtra is_published = true: aunque un administrador tenga sesión,
 *   la tienda pública solo muestra lo publicado (RLS ya lo garantiza para anon).
 * - getRelated() trabaja sobre el catálogo en memoria (getAll, cacheado): con
 *   decenas de productos es una sola consulta y mantiene la misma lógica que el JSON.
 */
@Injectable()
export class SupabaseProductRepository extends ProductRepository {
  private readonly api = inject(SupabaseRestService);

  private readonly todos$: Observable<Producto[]> = defer(() => this.consultar({})).pipe(
    shareReplay({ bufferSize: 1, refCount: false })
  );

  getAll(): Observable<Producto[]> {
    return this.todos$;
  }

  getBySlug(slug: string): Observable<Producto | null> {
    const buscado = slug.trim().toLowerCase();
    return defer(() => this.consultar({ slug: `eq.${buscado}`, limit: '1' })).pipe(map(ps => ps[0] ?? null));
  }

  getById(id: ProductoId): Observable<Producto | null> {
    const valor = String(id).trim();
    // Acepta el uuid de Supabase o el id numérico heredado de productos.json (legacy_id)
    if (UUID.test(valor)) {
      return defer(() => this.consultar({ id: `eq.${valor}`, limit: '1' })).pipe(map(ps => ps[0] ?? null));
    }
    if (/^\d+$/.test(valor)) {
      return defer(() => this.consultar({ legacy_id: `eq.${Number(valor)}`, limit: '1' })).pipe(map(ps => ps[0] ?? null));
    }
    return of(null);
  }

  getFeatured(limit = 6): Observable<Producto[]> {
    return defer(() => this.consultar({ is_featured: 'eq.true', limit: String(limit) }));
  }

  getRelated(producto: Producto, limit = 4): Observable<Producto[]> {
    return this.todos$.pipe(
      map(ps => {
        const puntaje = (p: Producto) =>
          (p.categoria === producto.categoria ? 2 : 0) + (p.marca === producto.marca ? 1 : 0);
        return ps
          .filter(p => String(p.id) !== String(producto.id))
          .map(p => ({ p, s: puntaje(p) }))
          .filter(x => x.s > 0)
          .sort((a, b) => b.s - a.s)
          .slice(0, limit)
          .map(x => x.p);
      })
    );
  }

  /** Consulta base: publicados, orden estable (legacy_id del JSON y luego nombre). */
  private consultar(filtros: Record<string, string>): Observable<Producto[]> {
    const urlPublica = (path: string) => this.api.urlPublica(BUCKET_CATALOGO, path);
    return this.api
      .select<ProductoRow>('products', {
        select: SELECT_PRODUCTO,
        is_published: 'eq.true',
        order: 'legacy_id.asc.nullslast,name.asc',
        ...filtros
      })
      .pipe(map(rows => rows.map(row => mapProductoRow(row, urlPublica))));
  }
}
