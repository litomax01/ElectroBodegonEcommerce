import { environment } from '../environments/environment';

/**
 * Cabeceras de seguridad de producción (las aplica server.ts; vercel.json repite las
 * principales para los archivos estáticos que sirve la CDN).
 *
 * CSP — decisiones:
 *  - 'unsafe-inline' en script-src/style-src: Angular SSR inyecta el script de reanudación de
 *    eventos y CSS crítico en línea. Pasar a nonces es una mejora futura.
 *  - frame-src https://www.google.com: único origen embebido (MapEmbedService, Google Maps).
 *  - Los orígenes de analítica solo se permiten si GA4/Meta Pixel están configurados.
 */
export function cabecerasSeguridad(opciones: { https: boolean }): Record<string, string> {
  const supabase = origenSupabase();
  const ga4 = !!environment.site.ga4Id;
  const pixel = !!environment.site.metaPixelId;

  const script = ["'self'", "'unsafe-inline'"];
  const conectar = ["'self'"];
  const imagenes = ["'self'", 'data:', 'blob:', 'https://images.unsplash.com', 'https://upload.wikimedia.org'];
  const marcos = ['https://www.google.com'];

  if (supabase) {
    conectar.push(supabase);
    imagenes.push(supabase);
  }
  if (ga4) {
    script.push('https://www.googletagmanager.com');
    conectar.push('https://www.google-analytics.com', 'https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://www.googletagmanager.com');
    imagenes.push('https://www.google-analytics.com', 'https://www.googletagmanager.com');
  }
  if (pixel) {
    script.push('https://connect.facebook.net');
    conectar.push('https://www.facebook.com', 'https://connect.facebook.net');
    imagenes.push('https://www.facebook.com');
  }

  const directivas = [
    "default-src 'self'",
    `script-src ${script.join(' ')}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
    "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com",
    `img-src ${imagenes.join(' ')}`,
    `connect-src ${conectar.join(' ')}`,
    `frame-src ${marcos.join(' ')}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'"
  ];
  if (opciones.https) directivas.push('upgrade-insecure-requests');

  const cabeceras: Record<string, string> = {
    'Content-Security-Policy': directivas.join('; '),
    'X-Content-Type-Options': 'nosniff',
    // Solo el propio sitio puede incrustarse (ningún tercero: anti-clickjacking)
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
  };
  if (opciones.https) cabeceras['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  return cabeceras;
}

function origenSupabase(): string | null {
  try {
    return environment.supabase.url ? new URL(environment.supabase.url).origin : null;
  } catch {
    return null;
  }
}
