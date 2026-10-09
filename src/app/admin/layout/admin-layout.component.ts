import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Meta } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { AdminAuthService } from '../core/admin-auth.service';
import { AdminUiService } from '../core/admin-ui.service';

/** Marco del panel: barra lateral (off-canvas en móvil), avisos y diálogo de confirmación. */
@Component({
  selector: 'app-admin-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 lg:flex">
      <!-- Barra superior (móvil) -->
      <header class="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-[#111827] text-white px-4 h-14">
        <button type="button" (click)="menuAbierto.set(true)" aria-label="Abrir menú"
                class="w-10 h-10 -ml-2 flex items-center justify-center rounded-lg hover:bg-white/10">
          <i class="fas fa-bars text-lg"></i>
        </button>
        <span class="font-montserrat font-extrabold tracking-wide text-sm">ELECTRO <span class="text-[#FFCC00]">BODEGÓN</span> · Admin</span>
        <span class="w-10"></span>
      </header>

      <!-- Fondo del menú móvil -->
      @if (menuAbierto()) {
        <div class="fixed inset-0 z-40 bg-black/50 lg:hidden" (click)="menuAbierto.set(false)" aria-hidden="true"></div>
      }

      <!-- Barra lateral -->
      <aside
        class="fixed inset-y-0 left-0 z-50 w-64 bg-[#111827] text-gray-200 flex flex-col transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:z-20"
        [class.-translate-x-full]="!menuAbierto()"
        aria-label="Navegación del panel">
        <div class="h-14 lg:h-16 px-5 flex items-center justify-between border-b border-white/10">
          <a routerLink="/admin" class="font-montserrat font-extrabold tracking-wide text-white leading-tight">
            ELECTRO <span class="text-[#FFCC00]">BODEGÓN</span>
            <span class="block text-[10px] font-inter font-medium tracking-widest text-gray-400 uppercase">Panel de administración</span>
          </a>
          <button type="button" (click)="menuAbierto.set(false)" aria-label="Cerrar menú"
                  class="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10">
            <i class="fas fa-xmark"></i>
          </button>
        </div>

        <nav class="flex-1 overflow-y-auto p-3 space-y-1 text-sm font-medium">
          <a routerLink="/admin" routerLinkActive="bg-white/10 text-white" [routerLinkActiveOptions]="{ exact: true }"
             class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5">
            <i class="fas fa-gauge-high w-5 text-center"></i> Resumen
          </a>
          <a routerLink="/admin/productos" routerLinkActive="bg-white/10 text-white" [routerLinkActiveOptions]="{ exact: true }"
             class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5">
            <i class="fas fa-box-open w-5 text-center"></i> Productos
          </a>
          <a routerLink="/admin/productos/nuevo" routerLinkActive="bg-white/10 text-white"
             class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5">
            <i class="fas fa-plus w-5 text-center"></i> Nuevo producto
          </a>
          <div class="pt-3 mt-3 border-t border-white/10">
            <a href="/" target="_blank" rel="noopener"
               class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5">
              <i class="fas fa-arrow-up-right-from-square w-5 text-center"></i> Ver tienda pública
            </a>
          </div>
        </nav>

        <div class="p-4 border-t border-white/10 text-sm">
          <p class="truncate text-white font-medium" [title]="auth.email() ?? ''">{{ auth.email() }}</p>
          @if (auth.rol(); as rol) {
            <p class="text-xs text-gray-400 capitalize mb-3">{{ rol }}</p>
          }
          <button type="button" (click)="cerrarSesion()" [disabled]="saliendo()"
                  class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-60 transition-colors">
            <i class="fas fa-right-from-bracket"></i> Cerrar sesión
          </button>
        </div>
      </aside>

      <!-- Contenido -->
      <main class="flex-1 min-w-0">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <router-outlet />
        </div>
      </main>
    </div>

    <!-- Avisos -->
    <div class="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-[60] space-y-2 pointer-events-none" aria-live="polite">
      @for (t of ui.toasts(); track t.id) {
        <div class="pointer-events-auto flex items-start gap-3 rounded-xl shadow-lg px-4 py-3 text-sm border"
             [class]="t.tipo === 'ok' ? 'bg-green-50 text-green-800 border-green-200' : t.tipo === 'error' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-blue-50 text-blue-800 border-blue-200'"
             [attr.role]="t.tipo === 'error' ? 'alert' : 'status'">
          <i class="fas mt-0.5" [class]="t.tipo === 'ok' ? 'fa-circle-check' : t.tipo === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info'"></i>
          <span class="flex-1">{{ t.texto }}</span>
          <button type="button" (click)="ui.cerrarToast(t.id)" aria-label="Cerrar aviso" class="opacity-60 hover:opacity-100">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
      }
    </div>

    <!-- Confirmación -->
    @if (ui.confirmacion(); as c) {
      <div class="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50" (keydown.escape)="ui.responder(false)">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" role="alertdialog" aria-modal="true"
             aria-labelledby="confirm-titulo" aria-describedby="confirm-msg">
          <h2 id="confirm-titulo" class="font-montserrat font-extrabold text-lg text-[#111827]">{{ c.titulo }}</h2>
          <p id="confirm-msg" class="mt-2 text-sm text-gray-600">{{ c.mensaje }}</p>
          @if (c.escribir) {
            <label class="block mt-4 text-sm text-gray-700">
              Para confirmar, escribe <code class="px-1.5 py-0.5 bg-gray-100 rounded text-[#E60000] break-all">{{ c.escribir }}</code>
              <input #campoConfirmar type="text" [(ngModel)]="textoConfirmacion" autocomplete="off" autocapitalize="off" spellcheck="false"
                     class="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#E60000]/40" />
            </label>
          }
          <div class="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" (click)="responder(false)"
                    class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium">Cancelar</button>
            <button type="button" (click)="responder(true)" [disabled]="!!c.escribir && textoConfirmacion !== c.escribir"
                    class="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    [class]="c.peligro ? 'bg-[#E60000] hover:bg-[#c40000]' : 'bg-[#111827] hover:bg-black'">{{ c.confirmar }}</button>
          </div>
        </div>
      </div>
    }
  `
})
export class AdminLayoutComponent {
  readonly auth = inject(AdminAuthService);
  readonly ui = inject(AdminUiService);
  private readonly router = inject(Router);
  private readonly meta = inject(Meta);

  readonly menuAbierto = signal(false);
  readonly saliendo = signal(false);
  textoConfirmacion = '';
  private readonly campoConfirmar = viewChild<ElementRef<HTMLInputElement>>('campoConfirmar');

  constructor() {
    // El panel nunca debe indexarse
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    // Cerrar el menú móvil al navegar
    this.router.events.subscribe(() => this.menuAbierto.set(false));
    // Enfocar el campo de confirmación al abrir el diálogo
    effect(() => this.campoConfirmar()?.nativeElement.focus());
  }

  responder(ok: boolean): void {
    this.textoConfirmacion = '';
    this.ui.responder(ok);
  }

  async cerrarSesion(): Promise<void> {
    this.saliendo.set(true);
    try {
      await this.auth.cerrarSesion();
      await this.router.navigate(['/admin/login']);
    } finally {
      this.saliendo.set(false);
    }
  }
}
