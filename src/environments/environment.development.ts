import { AppEnvironment } from './environment.model';
import { SUPABASE_PUBLIC_CONFIG } from './supabase.generated';

/**
 * Configuración de DESARROLLO (ng serve). Reemplaza a environment.ts vía
 * "fileReplacements" en angular.json.
 *
 * Supabase: igual que en producción, desde SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY
 * (archivo .env local o variables del sistema). Ver .env.example.
 */
export const environment: AppEnvironment = {
  production: false,
  supabase: SUPABASE_PUBLIC_CONFIG
};
