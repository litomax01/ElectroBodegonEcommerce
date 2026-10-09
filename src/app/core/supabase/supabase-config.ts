import { SupabasePublicConfig } from '../../../environments/environment.model';

export type ResultadoConfig =
  | { ok: true; url: string; anonKey: string }
  | { ok: false; motivo: string };

/**
 * Valida la configuración pública de Supabase antes de crear el cliente.
 *
 * Además de comprobar que exista, BLOQUEA cualquier clave privilegiada:
 * - claves nuevas "sb_secret_..." (equivalente a service_role);
 * - claves JWT cuyo claim "role" sea "service_role".
 * Una clave así en el navegador saltaría todas las políticas RLS.
 */
export function validarConfigSupabase(cfg: SupabasePublicConfig | undefined): ResultadoConfig {
  const url = cfg?.url?.trim() ?? '';
  const anonKey = cfg?.anonKey?.trim() ?? '';

  if (!url && !anonKey) return { ok: false, motivo: 'Supabase no configurado (url y anonKey vacías)' };
  if (!url) return { ok: false, motivo: 'Falta SUPABASE_URL' };
  if (!anonKey) return { ok: false, motivo: 'Falta SUPABASE_PUBLISHABLE_KEY' };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, motivo: 'SUPABASE_URL no es una URL válida' };
  }
  const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) {
    return { ok: false, motivo: 'SUPABASE_URL debe usar https (http solo para Supabase local)' };
  }

  if (anonKey.startsWith('sb_secret_')) {
    return { ok: false, motivo: 'Se recibió una clave SECRETA (sb_secret_). Solo se permite la clave pública.' };
  }
  if (anonKey.startsWith('sb_publishable_')) {
    return { ok: true, url: parsed.origin, anonKey };
  }

  const rol = rolDeJwt(anonKey);
  if (rol === 'service_role') {
    return { ok: false, motivo: 'Se recibió la clave service_role. Nunca debe usarse en el frontend.' };
  }
  if (rol !== 'anon') {
    return { ok: false, motivo: 'La clave pública no parece válida (sb_publishable_ / anon)' };
  }
  return { ok: true, url: parsed.origin, anonKey };
}

/** Lee el claim "role" de un JWT sin verificar la firma (solo para clasificarlo). */
function rolDeJwt(token: string): string | null {
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  try {
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')));
    return typeof json?.role === 'string' ? json.role : null;
  } catch {
    return null;
  }
}
