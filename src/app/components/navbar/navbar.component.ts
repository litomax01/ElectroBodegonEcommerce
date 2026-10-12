import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { STORE_CONFIG, whatsappLink } from '../../core/config/store.config';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html'
})
export class NavbarComponent {
  private readonly router = inject(Router);

  menuOpen = signal(false);
  readonly redes = STORE_CONFIG.redes;
  readonly whatsappUrl = whatsappLink(STORE_CONFIG.whatsappPrincipal);

  toggleMenu(): void {
    this.menuOpen.update(v => !v);
  }

  /** Envía la búsqueda al catálogo (parámetro `q`, el mismo que usa el catálogo) */
  buscar(evento: Event, texto: string): void {
    evento.preventDefault();
    const q = texto.trim().slice(0, 100);
    this.closeMenu();
    this.router.navigate(['/catalogo'], { queryParams: q ? { q } : {} });
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
