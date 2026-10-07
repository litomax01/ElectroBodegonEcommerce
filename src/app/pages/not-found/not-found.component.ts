import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="min-h-[65vh] flex items-center">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p class="font-montserrat font-black text-[#E60000] text-7xl sm:text-8xl leading-none mb-4">404</p>
        <h1 class="font-montserrat font-black text-[#111827] text-2xl sm:text-3xl mb-3">Página no encontrada</h1>
        <p class="font-inter text-gray-500 mb-8 max-w-md mx-auto">
          La página que buscas no existe o cambió de dirección. Te ayudamos a encontrar lo que necesitas.
        </p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <a routerLink="/"
             class="inline-flex items-center justify-center gap-2 bg-[#E60000] hover:bg-[#cc0000] text-white px-6 py-3 rounded-xl font-montserrat font-bold text-sm transition-all hover:scale-105">
            <i class="fas fa-home"></i> Ir al inicio
          </a>
          <a routerLink="/catalogo"
             class="inline-flex items-center justify-center gap-2 border-2 border-[#E60000] text-[#E60000] hover:bg-[#E60000] hover:text-white px-6 py-3 rounded-xl font-montserrat font-bold text-sm transition-all">
            <i class="fas fa-th-large"></i> Ver catálogo
          </a>
          <a routerLink="/sucursales"
             class="inline-flex items-center justify-center gap-2 border-2 border-gray-200 text-[#111827] hover:border-[#111827] px-6 py-3 rounded-xl font-montserrat font-bold text-sm transition-all">
            <i class="fas fa-map-marker-alt"></i> Sucursales
          </a>
        </div>
      </div>
    </section>
  `
})
export class NotFoundComponent {}
