import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ProductRepository } from '../../data/repositories/product.repository';
import { STORE_CONFIG } from '../../core/config/store.config';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './hero.component.html'
})
export class HeroComponent {
  private readonly productos = toSignal(inject(ProductRepository).getAll(), { initialValue: [] });

  readonly anioActual = new Date().getFullYear();
  readonly totalSucursales = STORE_CONFIG.sucursales.length;

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
}
