import { Component, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { STORE_CONFIG, whatsappLink } from './core/config/store.config';

const esRutaAdmin = (url: string): boolean => /^\/admin(\/|\?|#|$)/.test(url);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  templateUrl: './app.html'
})
export class App {
  whatsappUrl = whatsappLink(
    STORE_CONFIG.whatsappPrincipal,
    'Hola ' + STORE_CONFIG.nombre + ', quiero información de sus productos'
  );

  /** El panel /admin usa su propio marco: sin navbar, footer ni botón de WhatsApp de la tienda. */
  readonly enAdmin = signal(esRutaAdmin(inject(Location).path()));

  constructor() {
    inject(Router)
      .events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => this.enAdmin.set(esRutaAdmin(e.urlAfterRedirects)));
  }
}
