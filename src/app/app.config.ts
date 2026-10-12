import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withEnabledBlockingInitialNavigation,
  withInMemoryScrolling
} from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

import { routes } from './app.routes';
import { ProductRepository } from './data/repositories/product.repository';
import { SupabaseProductRepository } from './data/repositories/supabase/supabase-product.repository';
import { StoreConfigRemotoService } from './core/config/store-config-remoto.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // Al abrir otra página (ej. un producto relacionado) se vuelve arriba;
      // con atrás/adelante se restaura la posición anterior.
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
      // Con SSR + hidratación la navegación inicial debe terminar antes de que la app se dé por estable:
      // así el navegador reutiliza los datos que ya descargó el servidor (TransferState)
      withEnabledBlockingInitialNavigation()
    ),
    // fetch nativo: necesario para SSR; HttpClient además registra las peticiones pendientes
    // (el servidor espera los datos) y las reutiliza en el navegador (TransferState)
    provideHttpClient(withFetch()),
    provideClientHydration(withEventReplay()),
    // Sucursales, asesores y redes editables desde /admin/tienda: se cargan antes del primer render
    // (SSR incluido). Si fallan, se usa la configuración de respaldo de store.config.ts.
    provideAppInitializer(() => inject(StoreConfigRemotoService).cargar()),
    // Fuente de datos de productos: Supabase. JsonProductRepository se conserva como respaldo técnico
    // (assets/data/productos.json); para volver a él basta cambiar este useClass.
    { provide: ProductRepository, useClass: SupabaseProductRepository }
  ]
};
