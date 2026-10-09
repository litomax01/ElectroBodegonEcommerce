import { Component, inject } from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';
import { STORE_CONFIG, SucursalConfig, whatsappLink } from '../../core/config/store.config';
import { MapEmbedService } from '../../core/maps/map-embed.service';
import { SeoService } from '../../core/seo/seo.service';
import { migasLd, organizacionLd } from '../../core/seo/seo-schema';

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
  private readonly seo = inject(SeoService);

  readonly sucursales: Sucursal[] = STORE_CONFIG.sucursales.map(s => ({
    ...s,
    mapUrl: this.maps.embedUrl(s.mapa)
  }));

  constructor() {
    const abs = (u: string) => this.seo.absoluta(u);
    const lista = STORE_CONFIG.sucursales.map(s => `${s.zona}: ${s.direccion}`).join(' · ');
    this.seo.set({
      titulo: `Sucursales y contacto — ${STORE_CONFIG.nombre}`,
      descripcion: `Visítanos o escríbenos por WhatsApp. ${lista}. ${STORE_CONFIG.sucursales[0]?.horario ?? ''}.`,
      ruta: '/sucursales',
      jsonLd: [...organizacionLd(abs), migasLd([{ nombre: 'Inicio', ruta: '/' }, { nombre: 'Sucursales', ruta: '/sucursales' }], abs)]
    });
  }

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
