import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { STORE_CONFIG, whatsappLink } from '../../core/config/store.config';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html'
})
export class NavbarComponent {
  menuOpen = signal(false);
  readonly redes = STORE_CONFIG.redes;
  readonly whatsappUrl = whatsappLink(STORE_CONFIG.whatsappPrincipal);

  toggleMenu(): void {
    this.menuOpen.update(v => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
