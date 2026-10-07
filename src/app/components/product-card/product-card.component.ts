import { Component, Input, inject } from '@angular/core';
import { DOCUMENT, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Producto } from '../../core/models/producto.model';
import { ahorro, rutaProducto, tieneDescuento, urlAbsolutaProducto } from '../../core/models/producto.helpers';
import { STORE_CONFIG, SucursalConfig } from '../../core/config/store.config';
import { whatsappProductoLink } from '../../core/whatsapp/whatsapp-mensajes';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [DecimalPipe, RouterLink],
  templateUrl: './product-card.component.html'
})
export class ProductCardComponent {
  @Input({ required: true }) producto!: Producto;

  private readonly document = inject(DOCUMENT);
  readonly sucursales = STORE_CONFIG.sucursales;

  get ruta(): string[] {
    return rutaProducto(this.producto);
  }

  get imagenPrincipal(): string {
    return this.producto.imagenes[0]?.url ?? FALLBACK_IMG;
  }

  getWhatsappLink(s: SucursalConfig): string {
    return whatsappProductoLink(s, this.producto, urlAbsolutaProducto(this.document.baseURI, this.producto));
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    // Evita un bucle infinito si la imagen de respaldo también falla
    if (img.src !== FALLBACK_IMG) {
      img.src = FALLBACK_IMG;
    }
  }

  hasDiscount(): boolean {
    return tieneDescuento(this.producto);
  }

  getSavings(): number {
    return ahorro(this.producto);
  }
}
