import { Injectable, inject, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import { SupabaseService } from '../../core/supabase/supabase.service';

/**
 * anonimo  → sin sesión
 * no-admin → sesión válida pero el usuario NO está en admin_users
 * admin    → sesión válida y fila propia en admin_users (la autorización real la impone RLS)
 */
export type EstadoAdmin = 'cargando' | 'anonimo' | 'no-admin' | 'admin';

export type ResultadoLogin = { ok: true } | { ok: false; mensaje: string };

/**
 * Sesión del panel. Usa solo Supabase Auth con la clave publicable.
 * Ser "admin" aquí es una comodidad de interfaz: cada escritura vuelve a pasar por RLS
 * (private.is_admin()), que es la barrera real.
 */
@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly supabase = inject(SupabaseService);

  readonly estado = signal<EstadoAdmin>('cargando');
  readonly email = signal<string | null>(null);
  readonly rol = signal<string | null>(null);

  private iniciada: Promise<void> | null = null;

  get configurado(): boolean {
    return this.supabase.isConfigured;
  }

  /** Idempotente: la primera llamada recupera la sesión guardada y se suscribe a sus cambios. */
  inicializar(): Promise<void> {
    this.iniciada ??= this.arrancar();
    return this.iniciada;
  }

  private async arrancar(): Promise<void> {
    if (!this.supabase.isConfigured) {
      this.estado.set('anonimo');
      return;
    }
    const client = this.supabase.client;
    const { data } = await client.auth.getSession();
    await this.resolver(data.session);
    client.auth.onAuthStateChange((evento, session) => {
      if (evento === 'INITIAL_SESSION') return;
      // No se hacen llamadas a Supabase dentro del callback (puede bloquear): se difiere.
      setTimeout(() => void this.resolver(session), 0);
    });
  }

  private async resolver(session: Session | null): Promise<void> {
    if (!session) {
      this.email.set(null);
      this.rol.set(null);
      this.estado.set('anonimo');
      return;
    }
    this.email.set(session.user.email ?? null);
    const { data, error } = await this.supabase.client
      .from('admin_users')
      .select('role')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (error || !data) {
      this.rol.set(null);
      this.estado.set('no-admin');
      return;
    }
    this.rol.set(data.role as string);
    this.estado.set('admin');
  }

  async iniciarSesion(email: string, password: string): Promise<ResultadoLogin> {
    if (!this.supabase.isConfigured) {
      return { ok: false, mensaje: 'La conexión con Supabase no está configurada.' };
    }
    try {
      const { data, error } = await this.supabase.client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) return { ok: false, mensaje: this.traducir(error.message, error.status) };
      await this.resolver(data.session);
      return { ok: true };
    } catch {
      return { ok: false, mensaje: 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.' };
    }
  }

  async cerrarSesion(): Promise<void> {
    if (this.supabase.isConfigured) {
      await this.supabase.client.auth.signOut();
    }
    this.email.set(null);
    this.rol.set(null);
    this.estado.set('anonimo');
  }

  private traducir(mensaje: string, status?: number): string {
    const m = mensaje.toLowerCase();
    if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
    if (m.includes('email not confirmed')) return 'Tu correo aún no está confirmado.';
    if (status === 429 || m.includes('rate limit') || m.includes('too many')) {
      return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
    }
    if (m.includes('signup') && m.includes('disabled')) return 'El registro público está desactivado.';
    return 'No se pudo iniciar sesión. Inténtalo de nuevo.';
  }
}
