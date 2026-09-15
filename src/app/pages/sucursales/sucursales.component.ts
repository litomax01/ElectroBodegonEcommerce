import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export interface Sucursal {
  id: string;
  nombre: string;
  zona: string;
  direccion: string;
  telefono: string;
  asesorNombre: string;
  whatsapp: string;
  mapUrl: SafeResourceUrl;
  horario: string;
  icon: string;
}

@Component({
  selector: 'app-sucursales',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sucursales.component.html'
})
export class SucursalesComponent {
  sucursales: Sucursal[];

  constructor(private sanitizer: DomSanitizer) {
    this.sucursales = [
      {
        id: 'norte',
        nombre: 'Electro Bodegón Norte',
        zona: 'Sucursal Norte',
        direccion: 'Av. Del Maestro y Sebastián Buara',
        telefono: '0986 952 147',
        asesorNombre: 'Elizabeth',
        whatsapp: '593986952147',
        mapUrl: this.sanitizer.bypassSecurityTrustResourceUrl(
          'https://www.google.com/maps?q=Av.+Del+Maestro+y+Sebasti%C3%A1n+Buara&output=embed'
        ),
        horario: 'Lun – Sáb: 9:00 AM – 7:00 PM',
        icon: 'fas fa-map-marker-alt'
      },
      {
        id: 'sur',
        nombre: 'Electro Bodegón Sur',
        zona: 'Sucursal Sur',
        direccion: 'Dr. José Peralta y Amaluza',
        telefono: '0958 771 384',
        asesorNombre: 'Fernando',
        whatsapp: '593958771384',
        mapUrl: this.sanitizer.bypassSecurityTrustResourceUrl(
          'https://www.google.com/maps?q=Dr.+Jos%C3%A9+Peralta+y+Amaluza&output=embed'
        ),
        horario: 'Lun – Sáb: 9:00 AM – 7:00 PM',
        icon: 'fas fa-store'
      }
    ];
  }

  getWhatsappUrl(s: Sucursal): string {
    return 'https://wa.me/' + s.whatsapp + '?text=Hola%20' + s.asesorNombre + ',%20quiero%20información%20de%20sus%20productos';
  }

  isNorte(s: Sucursal): boolean {
    return s.id === 'norte';
  }
}
