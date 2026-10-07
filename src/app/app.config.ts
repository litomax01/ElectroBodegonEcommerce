import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import { ProductRepository } from './data/repositories/product.repository';
import { JsonProductRepository } from './data/repositories/json/json-product.repository';

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
    // Fuente de datos de productos. Fase 2: { provide: ProductRepository, useClass: SupabaseProductRepository }
    { provide: ProductRepository, useClass: JsonProductRepository }
  ]
};
