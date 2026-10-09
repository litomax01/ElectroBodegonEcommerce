import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Marcador local para productos sin imagen o con imagen que no carga.
 * - Sin recursos externos: nunca puede fallar ni provocar bucles de error.
 * - Rellena su contenedor (que define la proporción, normalmente aspect-square).
 * - Accesible: role="img" con el nombre del producto cuando se conoce.
 */
@Component({
  selector: 'app-imagen-no-disponible',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      role="img"
      [attr.aria-label]="nombre() ? 'Imagen no disponible: ' + nombre() : 'Imagen no disponible'"
      class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-50 to-gray-100 text-gray-400 select-none"
    >
      <svg viewBox="0 0 48 48" class="w-1/4 min-w-8 max-w-16 h-auto" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="6" y="10" width="36" height="28" rx="4" />
        <circle cx="17" cy="21" r="3" />
        <path d="M6 33l10-9 8 7 6-5 12 10" />
      </svg>
      <span class="font-inter text-xs sm:text-sm text-gray-500 text-center px-2" aria-hidden="true">
        Imagen no disponible
      </span>
      <span class="absolute bottom-0 inset-x-0 h-1 bg-[#E60000]/70" aria-hidden="true"></span>
    </div>
  `
})
export class ImagenNoDisponibleComponent {
  /** Nombre del producto, solo para el texto alternativo */
  readonly nombre = input<string | undefined>();
}
