import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import { ProductRepository } from './data/repositories/product.repository';
import { SupabaseProductRepository } from './data/repositories/supabase/supabase-product.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // Al abrir otra página (ej. un producto relacionado) se vuelve arriba;
      // con atrás/adelante se restaura la posición anterior.
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })
    ),
    provideHttpClient(),
    // Fuente de datos de productos: Supabase. JsonProductRepository se conserva como respaldo técnico
    // (assets/data/productos.json); para volver a él basta cambiar este useClass.
    { provide: ProductRepository, useClass: SupabaseProductRepository }
  ]
};
