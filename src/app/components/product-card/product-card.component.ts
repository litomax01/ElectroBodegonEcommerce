import { Component, Input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Producto } from '../../models/producto.model';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './product-card.component.html'
})
export class ProductCardComponent {
  @Input({ required: true }) producto!: Producto;

  getWhatsappLink(sucursal: 'norte' | 'sur'): string {
    const nombreEncoded = encodeURIComponent(this.producto.nombre);
    if (sucursal === 'norte') {
      return 'https://wa.me/593986952147?text=Hola%20Elizabeth,%20me%20interesa%20el%20producto:%20' + nombreEncoded;
    }
    return 'https://wa.me/593958771384?text=Hola%20Fernando,%20me%20interesa%20el%20producto:%20' + nombreEncoded;
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80';
  }

  getSavings(): number {
    return this.producto.precio_original - this.producto.precio_oferta;
  }
}
