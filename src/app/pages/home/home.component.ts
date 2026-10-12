import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { STORE_CONFIG, SucursalConfig, whatsappLink } from '../../core/config/store.config';
import { ProductRepository } from '../../data/repositories/product.repository';
import { Producto, ProductoId } from '../../core/models/producto.model';
import { ahorro, porcentajeDescuento, rutaProducto, tieneDescuento } from '../../core/models/producto.helpers';
import { HeroComponent } from '../../components/hero/hero.component';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { RevealDirective } from '../../shared/reveal.directive';
import { SeoService } from '../../core/seo/seo.service';
import { organizacionLd, sitioWebLd } from '../../core/seo/seo-schema';

export interface CategoriaHome {
  nombre: string;
  total: number;
  icono: string;
  /** Foto real de un producto de la categoría (null si no hay o falló) */
  imagen: string | null;
}

export interface MarcaHome {
  nombre: string;
  total: number;
}

/** Icono según el nombre de la categoría (las categorías vienen de los productos reales) */
function iconoCategoria(nombre: string): string {
  const n = nombre.toLowerCase();
  if (/tv|audio|sonido|video/.test(n)) return 'fa-tv';
  if (/blanca|refriger|lava|cocina/.test(n)) return 'fa-snowflake';
  if (/menor|licuad|cocina/.test(n)) return 'fa-blender';
  if (/hogar|mueble/.test(n)) return 'fa-couch';
  return 'fa-box-open';
}

/**
 * Foto general y representativa de cada tipo de categoría (Unsplash, gratuitas).
 * Si el nombre no coincide con ninguna, o la foto falla, se usa la foto de un producto de la categoría.
 */
const FOTOS_CATEGORIA: ReadonlyArray<{ nombre: RegExp; id: string }> = [
  { nombre: /tv|audio|sonido|video/i,     id: '1595935736128-db1f0a261263' }, // sala con televisor
  { nombre: /blanca|refriger|lava/i,      id: '1484154218962-a197022b5858' }, // cocina con refrigeradora y cocina
  { nombre: /menor|licuad|cocina/i,       id: '1570222094114-d054a817e56b' }, // mesón con cafetera y molino
  { nombre: /hogar|mueble/i,              id: '1583847268964-b28dc8f51f92' }  // sala luminosa
];

function fotoCategoria(nombre: string): string | null {
  const r = FOTOS_CATEGORIA.find(x => x.nombre.test(nombre));
  return r ? `https://images.unsplash.com/photo-${r.id}?w=800&q=80` : null;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, DecimalPipe, HeroComponent, ProductCardComponent, RevealDirective],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {
  destacados = signal<Producto[]>([]);
  loading = signal(true);
  skeletons = [1, 2, 3, 4, 5, 6];
  readonly sucursales = STORE_CONFIG.sucursales;
  readonly totalSucursales = STORE_CONFIG.sucursales.length;

  private readonly seo = inject(SeoService);
  private readonly productRepository = inject(ProductRepository);
  private readonly todos = toSignal(this.productRepository.getAll(), { initialValue: [] as Producto[] });

  /** URLs de imagen de categoría que fallaron (esa categoría pasa a mostrar su icono) */
  private readonly imagenesFallidas = signal<Set<string>>(new Set());

  /** Foto general de la categoría, si existe y no ha fallado */
  private fotoElegida(nombre: string, fallidas: Set<string>): string | null {
    const url = fotoCategoria(nombre);
    return url && !fallidas.has(url) ? url : null;
  }

  imagenCategoriaFallo(url: string): void {
    this.imagenesFallidas.update(s => new Set(s).add(url));
  }

  /** Categorías reales del catálogo, ordenadas por cantidad de productos */
  readonly categorias = computed<CategoriaHome[]>(() => {
    const fallidas = this.imagenesFallidas();
    const conteo = new Map<string, number>();
    const muestra = new Map<string, string>();
    for (const p of this.todos()) {
      if (!p.categoria) continue;
      conteo.set(p.categoria, (conteo.get(p.categoria) ?? 0) + 1);
      const url = p.imagenes[0]?.url;
      // Foto de la categoría: el primer producto con imagen que no haya fallado
      if (url && !fallidas.has(url) && !muestra.has(p.categoria)) muestra.set(p.categoria, url);
    }
    return [...conteo]
      .map(([nombre, total]) => ({
        nombre,
        total,
        icono: iconoCategoria(nombre),
        imagen: this.fotoElegida(nombre, fallidas) ?? muestra.get(nombre) ?? null
      }))
      .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre));
  });

  /** Marcas reales del catálogo, ordenadas por cantidad de productos */
  readonly marcas = computed<MarcaHome[]>(() => {
    const conteo = new Map<string, number>();
    for (const p of this.todos()) {
      if (p.marca) conteo.set(p.marca, (conteo.get(p.marca) ?? 0) + 1);
    }
    return [...conteo]
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre));
  });

  /** Producto con el mayor porcentaje de descuento (null si ninguno tiene descuento) */
  readonly promo = computed<Producto | null>(() => {
    let mejor: Producto | null = null;
    for (const p of this.todos()) {
      if (!tieneDescuento(p)) continue;
      if (!mejor || porcentajeDescuento(p) > porcentajeDescuento(mejor)) mejor = p;
    }
    return mejor;
  });

  ngOnInit(): void {
    const abs = (u: string) => this.seo.absoluta(u);
    this.seo.set({
      titulo: `${STORE_CONFIG.nombre} — Electrodomésticos, TV y línea blanca al mejor precio`,
      descripcion: STORE_CONFIG.descripcion,
      ruta: '/',
      jsonLd: [sitioWebLd(abs), ...organizacionLd(abs)]
    });
    this.productRepository.getFeatured(6).subscribe({
      next: (products) => {
        this.destacados.set(products);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  getMarcaQueryParams(marcaName: string): object {
    return { marca: marcaName };
  }

  trackById(_: number, p: Producto): ProductoId {
    return p.id;
  }

  rutaPromo(p: Producto): string[] {
    return rutaProducto(p);
  }

  ahorroPromo(p: Producto): number {
    return ahorro(p);
  }

  porcentaje(p: Producto): number {
    return porcentajeDescuento(p);
  }

  /** Imagen de la promoción; si falla se muestra un marcador sencillo */
  readonly promoImagenFallida = signal(false);

  getWhatsappUrl(s: SucursalConfig): string {
    return whatsappLink(s.whatsapp, `Hola ${s.asesorNombre}, quiero información de productos`);
  }
}
