import { Component, Injector, PLATFORM_ID, inject, signal } from '@angular/core';
import { Location, isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { STORE_CONFIG, whatsappLink } from './core/config/store.config';
import { environment } from '../environments/environment';

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

    // Solo en el navegador y si hay GA4 / Meta Pixel configurados: sin IDs ni siquiera se descarga el código
    const injector = inject(Injector);
    if (isPlatformBrowser(inject(PLATFORM_ID)) && (environment.site.ga4Id || environment.site.metaPixelId)) {
      void import('./core/analytics/analytics.service').then(m => injector.get(m.AnalyticsService).iniciar());
    }
  }
}
