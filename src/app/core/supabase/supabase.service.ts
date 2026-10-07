import { Injectable, PLATFORM_ID, inject, isDevMode } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { ResultadoConfig, validarConfigSupabase } from './supabase-config';

/**
 * Punto ÚNICO de acceso a Supabase (database, auth y storage).
 *
 * - El cliente se crea una sola vez y solo cuando alguien lo pide (perezoso):
 *   mientras nada lo use, no hay conexión ni cambio de comportamiento.
 * - Si la configuración falta o es inválida, `isConfigured` es false y la app
 *   sigue usando el JSON local. `client` lanza un error descriptivo.
 * - Ningún componente debe llamar a createClient() por su cuenta.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly config: ResultadoConfig = validarConfigSupabase(environment.supabase);
  private instancia: SupabaseClient | null = null;

  constructor() {
    if (!this.config.ok && isDevMode()) {
      console.info(`[supabase] ${this.config.motivo}. Se usan los datos locales.`);
    }
  }

  /** true si hay URL y clave pública válidas */
  get isConfigured(): boolean {
    return this.config.ok;
  }

  /** Motivo por el que no está disponible (para diagnóstico); null si está configurado */
  get motivoNoDisponible(): string | null {
    return this.config.ok ? null : this.config.motivo;
  }

  /** Cliente compartido. Lanza un error si Supabase no está configurado. */
  get client(): SupabaseClient {
    if (!this.config.ok) {
      throw new Error(`[supabase] Cliente no disponible: ${this.config.motivo}`);
    }
    this.instancia ??= createClient(this.config.url, this.config.anonKey, {
      auth: {
        // Sesión del administrador. En el servidor (SSR futuro) no hay localStorage.
        persistSession: this.esNavegador,
        autoRefreshToken: this.esNavegador,
        detectSessionInUrl: this.esNavegador, // enlaces de recuperación de contraseña
        storageKey: 'electro-bodegon-auth'
      }
    });
    return this.instancia;
  }
}
