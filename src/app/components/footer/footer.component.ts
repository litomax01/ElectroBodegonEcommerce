import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { STORE_CONFIG, whatsappLink } from '../../core/config/store.config';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.component.html'
})
export class FooterComponent {
  readonly redes = STORE_CONFIG.redes;
  readonly sucursales = STORE_CONFIG.sucursales;
  readonly whatsappPrincipal = STORE_CONFIG.whatsappPrincipal;
  readonly anioActual = new Date().getFullYear();

  whatsapp(numero: string): string {
    return whatsappLink(numero);
  }
}
