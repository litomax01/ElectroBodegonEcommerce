import { Component, Input, inject, signal } from '@angular/core';
import { ImagenNoDisponibleComponent } from '../imagen-no-disponible/imagen-no-disponible.component';
import { DecimalPipe } from '@angular/common';
import { SeoService } from '../../core/seo/seo.service';
import { RouterLink } from '@angular/router';
import { Producto } from '../../core/models/producto.model';
import { ahorro, rutaProducto, tieneDescuento, urlAbsolutaProducto } from '../../core/models/producto.helpers';
import { STORE_CONFIG, SucursalConfig } from '../../core/config/store.config';
import { whatsappProductoLink } from '../../core/whatsapp/whatsapp-mensajes';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [DecimalPipe, RouterLink, ImagenNoDisponibleComponent],
  templateUrl: './product-card.component.html'
})
export class ProductCardComponent {
  @Input({ required: true }) producto!: Producto;

  private readonly seo = inject(SeoService);
  readonly sucursales = STORE_CONFIG.sucursales;

  get ruta(): string[] {
    return rutaProducto(this.producto);
  }

  /** URL de la imagen principal, o null si el producto no tiene */
  get imagenPrincipal(): string | null {
    return this.producto.imagenes[0]?.url ?? null;
  }

  /** URL que ya falló al cargar: se sustituye por el marcador local (sin reintentos ni bucles) */
  readonly urlFallida = signal<string | null>(null);

  getWhatsappLink(s: SucursalConfig): string {
    return whatsappProductoLink(s, this.producto, urlAbsolutaProducto(this.seo.origen() + '/', this.producto));
  }

  hasDiscount(): boolean {
    return tieneDescuento(this.producto);
  }

  getSavings(): number {
    return ahorro(this.producto);
  }
}
