import { Component, DestroyRef, Renderer2, computed, effect, inject, input, signal } from '@angular/core';
import { DOCUMENT, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { ProductRepository } from '../../data/repositories/product.repository';
import { Producto } from '../../core/models/producto.model';
import {
  DISPONIBILIDAD_INFO, ahorro, caracteristicasPrincipales, especificacionesCompletas,
  medidas, porcentajeDescuento, tieneDescuento, urlAbsolutaProducto
} from '../../core/models/producto.helpers';
import { STORE_CONFIG, SucursalConfig } from '../../core/config/store.config';
import { whatsappProductoLink } from '../../core/whatsapp/whatsapp-mensajes';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { ProductGalleryComponent } from '../../components/product-gallery/product-gallery.component';

type Estado = 'cargando' | 'ok' | 'no-encontrado' | 'error';

interface Resultado {
  estado: Estado;
  producto: Producto | null;
}

const CLASE_CTA_FIJA = 'cta-producto-fija';

@Component({
  selector: 'app-producto-detalle',
  standalone: true,
  imports: [DecimalPipe, NgTemplateOutlet, RouterLink, ProductCardComponent, ProductGalleryComponent],
  templateUrl: './producto-detalle.component.html'
})
export class ProductoDetalleComponent {
  /** Viene de la ruta /producto/:slug (withComponentInputBinding) */
  readonly slug = input.required<string>();

  private readonly repo = inject(ProductRepository);
  private readonly title = inject(Title);
  private readonly document = inject(DOCUMENT);
  private readonly renderer = inject(Renderer2);

  /** Se recalcula al cambiar el slug (ej. al abrir un producto relacionado) */
  private readonly resultado = toSignal(
    toObservable(this.slug).pipe(
      switchMap(slug =>
        this.repo.getBySlug(slug).pipe(
          map((producto): Resultado => ({ estado: producto ? 'ok' : 'no-encontrado', producto })),
          catchError(() => of<Resultado>({ estado: 'error', producto: null })),
          startWith<Resultado>({ estado: 'cargando', producto: null })
        )
      )
    ),
    { initialValue: { estado: 'cargando', producto: null } as Resultado }
  );

  readonly estado = computed(() => this.resultado().estado);
  readonly producto = computed(() => this.resultado().producto);

  readonly relacionados = toSignal(
    toObservable(this.producto).pipe(switchMap(p => (p ? this.repo.getRelated(p, 4) : of([])))),
    { initialValue: [] as Producto[] }
  );

  /** Productos sugeridos cuando el slug no existe */
  readonly destacados = toSignal(this.repo.getFeatured(4).pipe(catchError(() => of([]))), {
    initialValue: [] as Producto[]
  });

  // ---- Datos derivados (solo lo que existe) ----
  readonly caracteristicas = computed(() => (this.producto() ? caracteristicasPrincipales(this.producto()!) : []));
  readonly especificaciones = computed(() => (this.producto() ? especificacionesCompletas(this.producto()!) : []));
  readonly medidas = computed(() => (this.producto() ? medidas(this.producto()!) : []));
  readonly descuento = computed(() => (this.producto() ? porcentajeDescuento(this.producto()!) : 0));
  readonly ahorro = computed(() => (this.producto() ? ahorro(this.producto()!) : 0));
  readonly conDescuento = computed(() => !!this.producto() && tieneDescuento(this.producto()!));
  readonly disponibilidad = computed(() => {
    const d = this.producto()?.disponibilidad;
    return d ? DISPONIBILIDAD_INFO[d] : null;
  });
  /** Texto completo; si solo existe la frase corta heredada, se usa esa */
  readonly textoDescripcion = computed(() => this.producto()?.descripcion ?? this.producto()?.descripcionCorta ?? '');
  /** El resumen superior solo se muestra si hay además una descripción larga (evita repetir) */
  readonly resumen = computed(() => (this.producto()?.descripcion ? this.producto()?.descripcionCorta : undefined));

  readonly sucursales = computed<SucursalConfig[]>(() => {
    const ids = this.producto()?.sucursalIds;
    const lista = STORE_CONFIG.sucursales;
    const filtradas = ids?.length ? lista.filter(s => ids.includes(s.id)) : lista;
    return filtradas.length ? filtradas : lista;
  });

  readonly imagenDimensionesFallida = signal(false);

  /** La sección Dimensiones solo existe si hay medidas o una imagen técnica que cargue */
  readonly hayDimensiones = computed(
    () => this.medidas().length > 0 || (!!this.producto()?.imagenDimensiones && !this.imagenDimensionesFallida())
  );

  constructor() {
    effect(() => {
      const estado = this.estado();
      const p = this.producto();
      if (estado === 'ok' && p) this.title.setTitle(`${p.nombre} — Electro Bodegón`);
      else if (estado === 'no-encontrado') this.title.setTitle('Producto no encontrado — Electro Bodegón');

      // En móvil la barra inferior reemplaza al botón flotante de WhatsApp
      if (estado === 'ok') this.renderer.addClass(this.document.body, CLASE_CTA_FIJA);
      else this.renderer.removeClass(this.document.body, CLASE_CTA_FIJA);
    });

    effect(() => {
      this.slug(); // al cambiar de producto se reintenta la imagen técnica
      this.imagenDimensionesFallida.set(false);
    });

    inject(DestroyRef).onDestroy(() => this.renderer.removeClass(this.document.body, CLASE_CTA_FIJA));
  }

  whatsappUrl(s: SucursalConfig): string {
    const p = this.producto()!;
    return whatsappProductoLink(s, p, urlAbsolutaProducto(this.document.baseURI, p));
  }

  /** Barra inferior móvil: lleva a los botones de WhatsApp y les pasa el foco (accesibilidad) */
  irAConsultar(): void {
    const destino = this.document.getElementById('consultar');
    if (!destino) return;
    const reducirMovimiento = this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;
    destino.scrollIntoView({ behavior: reducirMovimiento ? 'auto' : 'smooth', block: 'center' });
    destino.querySelector<HTMLElement>('a[href]')?.focus({ preventScroll: true });
  }
}
