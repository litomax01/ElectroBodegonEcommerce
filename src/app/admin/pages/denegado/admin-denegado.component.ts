import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Meta } from '@angular/platform-browser';
import { AdminAuthService } from '../../core/admin-auth.service';

/** Usuario autenticado que NO es administrador. */
@Component({
  selector: 'app-admin-denegado',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-10">
      <div class="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
        <div class="mx-auto w-14 h-14 rounded-full bg-red-50 text-[#E60000] flex items-center justify-center text-2xl mb-4">
          <i class="fas fa-lock"></i>
        </div>
        <h1 class="font-montserrat font-extrabold text-xl text-[#111827]">Acceso denegado</h1>
        <p class="text-sm text-gray-600 mt-2">
          La cuenta
          @if (auth.email(); as email) { <strong class="break-all">{{ email }}</strong> }
          no tiene permisos de administrador. Si crees que es un error, pide a quien gestiona la tienda que te habilite.
        </p>
        <div class="mt-6 flex flex-col gap-2">
          <button type="button" (click)="salir()" [disabled]="saliendo()"
                  class="w-full bg-[#E60000] hover:bg-[#c40000] disabled:opacity-70 text-white font-semibold rounded-lg py-3 transition-colors">
            @if (saliendo()) { Cerrando sesión… } @else { Cerrar sesión }
          </button>
          <a routerLink="/" class="text-sm text-gray-500 hover:text-[#E60000] py-2">Ir a la tienda</a>
        </div>
      </div>
    </div>
  `
})
export class AdminDenegadoComponent {
  readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  readonly saliendo = signal(false);

  constructor() {
    inject(Meta).updateTag({ name: 'robots', content: 'noindex, nofollow' });
  }

  async salir(): Promise<void> {
    this.saliendo.set(true);
    try {
      await this.auth.cerrarSesion();
      await this.router.navigate(['/admin/login']);
    } finally {
      this.saliendo.set(false);
    }
  }
}
