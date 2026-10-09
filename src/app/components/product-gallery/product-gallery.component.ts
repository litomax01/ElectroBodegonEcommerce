import { Component, computed, effect, input, signal, untracked } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { ProductoImagen } from '../../core/models/producto.model';
import { ImagenNoDisponibleComponent } from '../imagen-no-disponible/imagen-no-disponible.component';

/**
 * Galería de la ficha de producto.
 * - Imagen principal con NgOptimizedImage (modo `fill`: no requiere conocer el tamaño
 *   y reserva el espacio con aspect-square → sin saltos de diseño).
 * - Miniaturas solo si hay más de una imagen.
 * - Si no hay imágenes o una falla, se muestra un marcador local (sin recurso externo).
 */
@Component({
  selector: 'app-product-gallery',
  standalone: true,
  imports: [NgOptimizedImage, ImagenNoDisponibleComponent],
  templateUrl: './product-gallery.component.html'
})
export class ProductGalleryComponent {
  readonly imagenes = input.required<ProductoImagen[]>();
  readonly nombre = input.required<string>();
  readonly etiqueta = input<string | undefined>();

  private readonly indice = signal(0);
  private readonly fallidas = signal<ReadonlySet<string>>(new Set());

  /** Imágenes que no han fallado al cargar */
  readonly validas = computed(() => this.imagenes().filter(img => !this.fallidas().has(img.url)));

  readonly actual = computed<ProductoImagen | null>(() => {
    const lista = this.validas();
    if (lista.length === 0) return null;
    return lista[Math.min(this.indice(), lista.length - 1)];
  });

  readonly indiceActual = computed(() => Math.min(this.indice(), Math.max(this.validas().length - 1, 0)));

  constructor() {
    // Al cambiar de producto (misma instancia reutilizada por el router) se reinicia la galería
    effect(() => {
      this.imagenes();
      untracked(() => {
        this.indice.set(0);
        this.fallidas.set(new Set());
      });
    });
  }

  seleccionar(i: number): void {
    this.indice.set(i);
  }

  anterior(): void {
    const n = this.validas().length;
    this.indice.set((this.indiceActual() - 1 + n) % n);
  }

  siguiente(): void {
    const n = this.validas().length;
    this.indice.set((this.indiceActual() + 1) % n);
  }

  onError(url: string): void {
    this.fallidas.update(set => new Set(set).add(url));
  }
}
