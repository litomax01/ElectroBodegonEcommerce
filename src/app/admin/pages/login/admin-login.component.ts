import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Meta } from '@angular/platform-browser';
import { AdminAuthService } from '../../core/admin-auth.service';

/** Inicio de sesión del panel. No existe registro: los administradores se dan de alta desde Supabase. */
@Component({
  selector: 'app-admin-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 px-4 py-10">
      <div class="w-full max-w-md">
        <div class="text-center mb-6">
          <p class="font-montserrat font-extrabold text-2xl tracking-wide text-[#111827]">
            ELECTRO <span class="text-[#E60000]">BODEGÓN</span>
          </p>
          <p class="text-xs uppercase tracking-widest text-gray-500 mt-1">Panel de administración</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="enviar()" novalidate
              class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 space-y-5">
          <h1 class="font-montserrat font-extrabold text-xl text-[#111827]">Iniciar sesión</h1>

          @if (error()) {
            <div role="alert" class="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm px-3 py-2.5">
              <i class="fas fa-circle-exclamation mt-0.5"></i><span>{{ error() }}</span>
            </div>
          }
          @if (!auth.configurado) {
            <div role="alert" class="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2.5">
              La conexión con Supabase no está configurada en este entorno.
            </div>
          }

          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
            <input id="email" type="email" formControlName="email" autocomplete="username" inputmode="email"
                   class="w-full rounded-lg border px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#E60000]/40"
                   [class]="invalido('email') ? 'border-red-400' : 'border-gray-300'"
                   [attr.aria-invalid]="invalido('email')" aria-describedby="email-error" />
            @if (invalido('email')) {
              <p id="email-error" class="text-xs text-red-600 mt-1">Ingresa un correo válido.</p>
            }
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <div class="relative">
              <input id="password" [type]="verPassword() ? 'text' : 'password'" formControlName="password" autocomplete="current-password"
                     class="w-full rounded-lg border px-3 py-2.5 pr-11 focus:outline-none focus:ring-2 focus:ring-[#E60000]/40"
                     [class]="invalido('password') ? 'border-red-400' : 'border-gray-300'"
                     [attr.aria-invalid]="invalido('password')" aria-describedby="password-error" />
              <button type="button" (click)="verPassword.set(!verPassword())"
                      [attr.aria-label]="verPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'" [attr.aria-pressed]="verPassword()"
                      class="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-gray-500 hover:text-gray-800">
                <i class="fas" [class]="verPassword() ? 'fa-eye-slash' : 'fa-eye'"></i>
              </button>
            </div>
            @if (invalido('password')) {
              <p id="password-error" class="text-xs text-red-600 mt-1">Ingresa tu contraseña.</p>
            }
          </div>

          <button type="submit" [disabled]="cargando()"
                  class="w-full flex items-center justify-center gap-2 bg-[#E60000] hover:bg-[#c40000] disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-3 transition-colors">
            @if (cargando()) {
              <i class="fas fa-spinner fa-spin"></i> Ingresando…
            } @else {
              Ingresar
            }
          </button>
        </form>

        <p class="text-center text-sm text-gray-500 mt-6">
          <a routerLink="/" class="hover:text-[#E60000]"><i class="fas fa-arrow-left mr-1"></i> Volver a la tienda</a>
        </p>
      </div>
    </div>
  `
})
export class AdminLoginComponent {
  readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });
  readonly cargando = signal(false);
  readonly verPassword = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    inject(Meta).updateTag({ name: 'robots', content: 'noindex, nofollow' });
  }

  invalido(campo: 'email' | 'password'): boolean {
    const c = this.form.controls[campo];
    return c.invalid && (c.touched || c.dirty);
  }

  async enviar(): Promise<void> {
    if (this.cargando()) return; // evita el doble envío
    this.error.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.cargando.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      const r = await this.auth.iniciarSesion(email, password);
      if (!r.ok) {
        this.error.set(r.mensaje);
        this.form.controls.password.reset('');
        return;
      }
      if (this.auth.estado() === 'admin') {
        const destino = this.route.snapshot.queryParamMap.get('returnUrl');
        // Solo rutas internas del panel (evita redirecciones abiertas)
        const seguro = destino && /^\/admin(\/|$)/.test(destino) && !destino.startsWith('//') ? destino : '/admin';
        await this.router.navigateByUrl(seguro);
      } else {
        await this.router.navigate(['/admin/acceso-denegado']);
      }
    } finally {
      this.cargando.set(false);
    }
  }
}
