import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Modo de renderizado por ruta:
 *  - /admin/**  → Client: panel privado, sin SSR (nada de contenido en el HTML inicial, no indexable).
 *  - el resto   → Server: se renderiza en cada petición. Con datos frescos de Supabase (productos nuevos,
 *                 precios, publicado/oculto) sin redeploy, y con el dominio real en canonical/Open Graph
 *                 (un prerender en build fijaría http://localhost en esas etiquetas).
 */
export const serverRoutes: ServerRoute[] = [
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/**', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Server }
];
