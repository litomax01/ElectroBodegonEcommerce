import { Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ProductRepository } from '../../data/repositories/product.repository';
import { STORE_CONFIG, SucursalConfig, whatsappLink } from '../../core/config/store.config';
import { Producto } from '../../core/models/producto.model';
import { ahorro, porcentajeDescuento, rutaProducto, tieneDescuento } from '../../core/models/producto.helpers';

/** Fotos de stock (Unsplash, gratuitas) usadas mientras no haya foto real del asesor */
const FOTOS_ASESOR_STOCK: Record<string, string> = {
  norte: 'https://images.unsplash.com/photo-1758518729466-827cd8293992?w=600&q=80',
  sur: 'https://images.unsplash.com/photo-1595482189276-c6b8e0cc5e54?w=600&q=80'
};

/** Tiempo entre diapositivas (ms) */
const INTERVALO_MS = 7000;

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './hero.component.html'
})
export class HeroComponent {
  private readonly productos = toSignal(inject(ProductRepository).getAll(), { initialValue: [] });

  readonly totalSucursales = STORE_CONFIG.sucursales.length;
  readonly sucursales = STORE_CONFIG.sucursales;
  readonly whatsappUrl = whatsappLink(
    STORE_CONFIG.whatsappPrincipal,
    'Hola ' + STORE_CONFIG.nombre + ', quiero información de sus productos'
  );

  /** Total redondeado hacia abajo a la decena (ej. 55 → "50+") */
  readonly totalProductosLabel = computed(() => {
    const n = this.productos().length;
    if (n === 0) return '—';
    return n < 10 ? String(n) : Math.floor(n / 10) * 10 + '+';
  });

  readonly totalMarcas = computed(() => {
    const n = new Set(this.productos().map(p => p.marca)).size;
    return n === 0 ? '—' : String(n);
  });

  /** URLs de imagen que fallaron: esa oferta sale del carrusel (sin reintentos) */
  private readonly fallidas = signal<Set<string>>(new Set());

  /** Mayores ahorros reales del catálogo con imagen válida (máx. 3): una diapositiva por producto */
  readonly promos = computed<Producto[]>(() =>
    this.productos()
      .filter(p => tieneDescuento(p) && this.imagen(p) !== null)
      .sort((a, b) => porcentajeDescuento(b) - porcentajeDescuento(a))
      .slice(0, 3)
  );

  /** Producto cuya foto ilustra la diapositiva de bienvenida (línea blanca si hay; si no, el primero con foto) */
  readonly portada = computed<Producto | null>(() => {
    const conFoto = this.productos().filter(p => this.imagen(p) !== null);
    return conFoto.find(p => /blanca/i.test(p.categoria ?? '')) ?? conFoto[0] ?? null;
  });

  // ── Carrusel ─────────────────────────────────────────
  /** Banner de ofertas (solo si hay productos con descuento): ocupa la primera posición */
  readonly desfase = computed(() => (this.promos().length > 0 ? 1 : 0));

  /** Mayor descuento real del catálogo (para el titular del banner) */
  readonly mayorDescuento = computed(() => {
    const p = this.promos()[0];
    return p ? porcentajeDescuento(p) : 0;
  });

  /** Hasta 4 productos de categorías distintas (los de mayor descuento con foto) para la vitrina del banner */
  readonly vitrina = computed<Producto[]>(() => {
    const vistas = new Set<string>();
    const resultado: Producto[] = [];
    const orden = this.productos()
      .filter(p => this.imagen(p) !== null)
      .sort((a, b) => porcentajeDescuento(b) - porcentajeDescuento(a));
    for (const p of orden) {
      const c = p.categoria ?? '';
      if (vistas.has(c)) continue;
      vistas.add(c);
      resultado.push(p);
      if (resultado.length === 4) break;
    }
    return resultado;
  });

  /** Alterna rojo/blanco: la última diapositiva toma el color opuesto a la anterior */
  readonly asesoriaBlanca = computed(() => this.promos().length % 2 === 1);

  /** Banner + mensaje + ofertas + asesoría */
  readonly total = computed(() => this.promos().length + 2 + this.desfase());
  private readonly posicion = signal(0);
  /** Índice visible (siempre dentro del rango, aunque cambie el número de diapositivas) */
  readonly actual = computed(() => this.posicion() % this.total());
  readonly puntos = computed(() => Array.from({ length: this.total() }, (_, i) => i));

  private pausado = false;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      // Sin rotación automática si la persona pidió menos movimiento
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const timer = setInterval(() => {
        if (!this.pausado && !document.hidden) this.siguiente();
      }, INTERVALO_MS);
      destroyRef.onDestroy(() => clearInterval(timer));
    });
  }

  siguiente(): void {
    this.posicion.set((this.actual() + 1) % this.total());
  }

  anterior(): void {
    this.posicion.set((this.actual() - 1 + this.total()) % this.total());
  }

  ir(i: number): void {
    this.posicion.set(i);
  }

  pausar(valor: boolean): void {
    this.pausado = valor;
  }

  // ── Asesores ─────────────────────────────────────────
  private readonly sinFotoAsesor = signal<Set<string>>(new Set());

  /**
   * Foto de cada asesor. Primero la real: public/asesores/<id de la sucursal>.jpg (norte.jpg, sur.jpg).
   * Si no existe, una foto de stock (Unsplash) ilustrativa, que NO corresponde a la persona real.
   */
  fotoAsesor(s: SucursalConfig): string | null {
    if (!this.sinFotoAsesor().has(s.id)) return 'asesores/' + s.id + '.jpg';
    return FOTOS_ASESOR_STOCK[s.id] ?? null;
  }

  fotoAsesorFallo(s: SucursalConfig): void {
    this.sinFotoAsesor.update(set => new Set(set).add(s.id));
  }

  // ── Productos ────────────────────────────────────────
  imagen(p: Producto): string | null {
    const url = p.imagenes[0]?.url ?? null;
    return url && !this.fallidas().has(url) ? url : null;
  }

  imagenFallo(p: Producto): void {
    const url = p.imagenes[0]?.url;
    if (url) this.fallidas.update(s => new Set(s).add(url));
  }

  ruta(p: Producto): string[] {
    return rutaProducto(p);
  }

  porcentaje(p: Producto): number {
    return porcentajeDescuento(p);
  }

  ahorroDe(p: Producto): number {
    return ahorro(p);
  }

  whatsappSucursal(s: SucursalConfig): string {
    return whatsappLink(s.whatsapp, `Hola ${s.asesorNombre}, quiero información de productos`);
  }
}
