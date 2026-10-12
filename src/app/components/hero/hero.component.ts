import { Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ProductRepository } from '../../data/repositories/product.repository';
import { BannerPortada, HeroBannersService, PersonalizacionesHero } from '../../core/config/hero-banners.service';
import { STORE_CONFIG, SucursalConfig, whatsappLink } from '../../core/config/store.config';
import { Producto } from '../../core/models/producto.model';
import { ahorro, porcentajeDescuento, rutaProducto } from '../../core/models/producto.helpers';
import {
  TEXTOS_ORIGINALES,
  claveFoto,
  mayorDescuento,
  seleccionarPortada,
  seleccionarPromos,
  seleccionarVitrina
} from '../../core/hero/hero-seleccion';

/** Fotos de stock (Unsplash, gratuitas) usadas mientras no haya foto real del asesor */
const FOTOS_ASESOR_STOCK: Record<string, string> = {
  norte: 'https://images.unsplash.com/photo-1758518729466-827cd8293992?w=600&q=80',
  sur: 'https://images.unsplash.com/photo-1595482189276-c6b8e0cc5e54?w=600&q=80'
};

/**
 * Diapositiva del carrusel. Primero van los banners propios (se editan en /admin/portada) y
 * después las automáticas, que el administrador puede encender o apagar.
 */
export type Diapositiva =
  | { clave: string; tipo: 'banner'; banner: BannerPortada; blanco: boolean }
  | { clave: string; tipo: 'ofertas'; blanco: false }
  | { clave: string; tipo: 'bienvenida'; blanco: true }
  | { clave: string; tipo: 'promo'; producto: Producto; blanco: boolean; orden: number }
  | { clave: string; tipo: 'asesoria'; blanco: boolean };

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './hero.component.html'
})
export class HeroComponent {
  private readonly productos = toSignal(inject(ProductRepository).getAll(), { initialValue: [] });
  private readonly banners = toSignal(inject(HeroBannersService).listar(), { initialValue: [] as BannerPortada[] });
  private readonly personalizaciones = toSignal(inject(HeroBannersService).personalizaciones(), {
    initialValue: { slides: {}, fotos: {} } as PersonalizacionesHero
  });
  /** Fotos propias por posición; lo que no está aquí usa la foto original del producto. */
  private readonly fotos = computed(() => this.personalizaciones().fotos);
  private readonly config = STORE_CONFIG.hero;

  /**
   * Textos de las diapositivas automáticas: lo que el administrador personalizó en /admin/portada
   * y, donde no cambió nada, el texto original de la tienda.
   */
  readonly textos = computed(() => {
    const p = this.personalizaciones().slides;
    const o = p.ofertas;
    const b = p.bienvenida;
    const a = p.asesoria;
    const O = TEXTOS_ORIGINALES;
    return {
      ofertas: {
        titulo: o?.title || O.ofertas.titulo,
        sub: o?.subtitle || O.ofertas.sub,
        pre: o?.eyebrow || O.ofertas.pre,
        pill: o?.body || O.ofertas.pill,
        boton: o?.buttonLabel || O.ofertas.boton
      },
      bienvenida: {
        chip: b?.eyebrow || O.bienvenida.chip(this.totalSucursales),
        titulo: b?.title || O.bienvenida.titulo,
        acento: b?.subtitle || O.bienvenida.acento,
        texto: b?.body || O.bienvenida.texto,
        lista: b?.bullets?.length ? b.bullets : [...O.bienvenida.lista],
        boton: b?.buttonLabel || O.bienvenida.boton
      },
      promos: { boton: p.promos?.buttonLabel || O.promos.boton },
      asesoria: {
        chip: a?.eyebrow || O.asesoria.chip,
        titulo: a?.title || O.asesoria.titulo,
        texto: a?.body || O.asesoria.texto,
        boton: a?.buttonLabel || O.asesoria.boton
      }
    };
  });

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

  private readonly tieneFoto = (p: Producto): boolean => this.imagen(p) !== null;

  /** Productos de las diapositivas de oferta: los 3 de mayor ahorro del catálogo. */
  readonly promos = computed<Producto[]>(() => seleccionarPromos(this.productos(), this.tieneFoto));

  /** Producto cuya foto ilustra la bienvenida (si no hay foto propia). */
  readonly portada = computed<Producto | null>(() => seleccionarPortada(this.productos(), this.tieneFoto));

  // ── Carrusel ─────────────────────────────────────────
  /** Mayor descuento real del catálogo (para el titular del banner de ofertas) */
  readonly mayorDescuento = computed(() => mayorDescuento(this.productos()));

  /** Hasta 4 productos de categorías distintas para la vitrina del banner de ofertas */
  readonly vitrina = computed<Producto[]>(() => seleccionarVitrina(this.productos(), this.tieneFoto));

  /** Foto propia de la bienvenida ('' = usa la del producto). */
  readonly fotoBienvenida = computed(() => this.fotos()[claveFoto('bienvenida', 1)] ?? '');

  /** Foto de la posición k (0 = primera) de la vitrina: la propia o la del producto. */
  fotoVitrina(p: Producto, k: number): string | null {
    return this.fotos()[claveFoto('ofertas', k + 1)] || this.imagen(p);
  }

  /** Foto de la diapositiva de oferta número i (0 = primera): la propia o la del producto. */
  fotoPromo(p: Producto, i: number): string | null {
    return this.fotos()[claveFoto('promos', i + 1)] || this.imagen(p);
  }

  /**
   * Lista final de diapositivas. Los colores de las automáticas alternan rojo/blanco a partir de la
   * diapositiva anterior; los banners propios usan el color que eligió el administrador.
   */
  readonly diapositivas = computed<Diapositiva[]>(() => {
    const lista: Diapositiva[] = [];
    let anteriorBlanca = true; // la primera automática sale en rojo
    const alternar = () => (anteriorBlanca = !anteriorBlanca);

    for (const b of this.banners()) {
      const blanco = b.layout === 'texto_foto' && b.theme === 'blanco';
      lista.push({ clave: 'banner-' + b.id, tipo: 'banner', banner: b, blanco });
      anteriorBlanca = blanco;
    }
    const hayPromos = this.promos().length > 0;
    if (this.config.mostrarOfertas && hayPromos) {
      lista.push({ clave: 'ofertas', tipo: 'ofertas', blanco: false });
      anteriorBlanca = false;
    }
    if (this.config.mostrarBienvenida) {
      lista.push({ clave: 'bienvenida', tipo: 'bienvenida', blanco: true });
      anteriorBlanca = true;
    }
    if (this.config.mostrarPromos) {
      this.promos().forEach((p, orden) => lista.push({ clave: 'promo-' + p.id, tipo: 'promo', producto: p, blanco: alternar(), orden }));
    }
    if (this.config.mostrarAsesores) {
      lista.push({ clave: 'asesoria', tipo: 'asesoria', blanco: alternar() });
    }
    // Nunca queda el carrusel vacío
    if (lista.length === 0) lista.push({ clave: 'bienvenida', tipo: 'bienvenida', blanco: true });
    return lista;
  });

  readonly total = computed(() => this.diapositivas().length);
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
        if (!this.pausado && !document.hidden && this.total() > 1) this.siguiente();
      }, this.config.intervaloSeg * 1000);
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
   * Foto de cada asesor, en este orden: la subida desde el panel; public/asesores/<id>.jpg
   * (norte.jpg, sur.jpg); y una foto de stock (Unsplash) ilustrativa que NO corresponde a la persona real.
   */
  fotoAsesor(s: SucursalConfig): string | null {
    const fallidas = this.sinFotoAsesor();
    if (s.asesorFoto && !fallidas.has('panel:' + s.id)) return s.asesorFoto;
    if (!fallidas.has(s.id)) return 'asesores/' + s.id + '.jpg';
    return FOTOS_ASESOR_STOCK[s.id] ?? null;
  }

  fotoAsesorFallo(s: SucursalConfig): void {
    const clave = s.asesorFoto && !this.sinFotoAsesor().has('panel:' + s.id) ? 'panel:' + s.id : s.id;
    this.sinFotoAsesor.update(set => new Set(set).add(clave));
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

  /** Enlace interno ("/catalogo") → routerLink; https externo → href. */
  esInterno(link: string): boolean {
    return link.startsWith('/');
  }

  /** Separa "/catalogo?orden=descuento" en ruta y parámetros (routerLink codificaría el "?"). */
  destino(link: string): { ruta: string; params: Record<string, string> } {
    const [ruta, consulta = ''] = link.split('?');
    return { ruta: ruta || '/', params: Object.fromEntries(new URLSearchParams(consulta)) };
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
