import { Injectable, inject, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';
import { Producto, ProductoId } from '../../../core/models/producto.model';
import { ProductRepository } from '../product.repository';
import { ProductoJson, mapProductoJson } from './producto-json.mapper';

/** Lee los productos desde public/assets/data/productos.json */
@Injectable()
export class JsonProductRepository extends ProductRepository {
  private readonly http = inject(HttpClient);
  private readonly dataUrl = 'assets/data/productos.json';

  /** Se descarga una sola vez y se comparte entre todas las páginas */
  private readonly productos$: Observable<Producto[]> = this.http
    .get<ProductoJson[]>(this.dataUrl)
    .pipe(
      map(raw => this.garantizarSlugsUnicos(raw.map(mapProductoJson)).filter(p => p.publicado)),
      shareReplay({ bufferSize: 1, refCount: false })
    );

  getAll(): Observable<Producto[]> {
    return this.productos$;
  }

  getBySlug(slug: string): Observable<Producto | null> {
    const buscado = slug.trim().toLowerCase();
    return this.productos$.pipe(map(ps => ps.find(p => p.slug === buscado) ?? null));
  }

  getById(id: ProductoId): Observable<Producto | null> {
    return this.productos$.pipe(map(ps => ps.find(p => String(p.id) === String(id)) ?? null));
  }

  getFeatured(limit = 6): Observable<Producto[]> {
    return this.productos$.pipe(map(ps => ps.filter(p => p.destacado).slice(0, limit)));
  }

  getRelated(producto: Producto, limit = 4): Observable<Producto[]> {
    return this.productos$.pipe(
      map(ps => {
        const otros = ps.filter(p => String(p.id) !== String(producto.id));
        const puntaje = (p: Producto) =>
          (p.categoria === producto.categoria ? 2 : 0) + (p.marca === producto.marca ? 1 : 0);
        return otros
          .map(p => ({ p, s: puntaje(p) }))
          .filter(x => x.s > 0)
          .sort((a, b) => b.s - a.s) // sort estable: conserva el orden original en empates
          .slice(0, limit)
          .map(x => x.p);
      })
    );
  }

  /** Si dos productos generan el mismo slug, el repetido recibe el sufijo "-{id}". */
  private garantizarSlugsUnicos(productos: Producto[]): Producto[] {
    const vistos = new Set<string>();
    return productos.map(p => {
      if (!vistos.has(p.slug)) {
        vistos.add(p.slug);
        return p;
      }
      const slug = `${p.slug}-${p.id}`;
      if (isDevMode()) console.warn(`[productos] slug duplicado "${p.slug}" → "${slug}"`);
      vistos.add(slug);
      return { ...p, slug };
    });
  }
}
