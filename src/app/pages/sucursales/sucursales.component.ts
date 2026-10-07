import { Component, inject } from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';
import { STORE_CONFIG, SucursalConfig, whatsappLink } from '../../core/config/store.config';
import { MapEmbedService } from '../../core/maps/map-embed.service';

export interface Sucursal extends SucursalConfig {
  /** null si la ubicación no es válida (se muestra un aviso en lugar del mapa) */
  mapUrl: SafeResourceUrl | null;
}

@Component({
  selector: 'app-sucursales',
  standalone: true,
  imports: [],
  templateUrl: './sucursales.component.html'
})
export class SucursalesComponent {
  private readonly maps = inject(MapEmbedService);

  readonly sucursales: Sucursal[] = STORE_CONFIG.sucursales.map(s => ({
    ...s,
    mapUrl: this.maps.embedUrl(s.mapa)
  }));

  getWhatsappUrl(s: Sucursal): string {
    return whatsappLink(s.whatsapp, `Hola ${s.asesorNombre}, quiero información de sus productos`);
  }

  getContactUrl(s: Sucursal): string {
    return whatsappLink(s.whatsapp, `Hola ${s.asesorNombre}, me gustaría que me contacten`);
  }

  isNorte(s: Sucursal): boolean {
    return s.id === 'norte';
  }
}
