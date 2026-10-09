import { AppEnvironment } from './environment.model';
import { SUPABASE_PUBLIC_CONFIG } from './supabase.generated';

/**
 * Configuración de PRODUCCIÓN (ng build).
 *
 * Los valores de Supabase NO se escriben aquí: vienen de las variables de entorno
 * SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY, que scripts/generar-config-supabase.mjs vuelca
 * en supabase.generated.ts (ignorado por git). Ver .env.example.
 */
export const environment: AppEnvironment = {
  production: true,
  supabase: SUPABASE_PUBLIC_CONFIG
};
