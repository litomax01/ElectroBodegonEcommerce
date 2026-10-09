import { environment } from '../environments/environment';

/**
 * robots.txt: todo el sitio público es indexable salvo el panel.
 * Las variantes del catálogo con filtros (?categoria=...) NO se bloquean aquí: su canonical apunta
 * a /catalogo y los buscadores deben poder leerlo.
 */
export function construirRobots(origen: string | null): string {
  const lineas = ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /admin/', ''];
  if (origen) lineas.push(`Sitemap: ${origen}/sitemap.xml`, '');
  return lineas.join('\n');
}

interface FilaSitemap {
  slug: string;
  updated_at: string | null;
}

const TTL_MS = 10 * 60 * 1000;
let cache: { origen: string; xml: string; hasta: number } | null = null;

const escapar = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** sitemap.xml con las páginas fijas y todos los productos PUBLICADOS (se lee de Supabase con la clave pública). */
export async function construirSitemap(origen: string): Promise<string> {
  if (cache && cache.origen === origen && cache.hasta > Date.now()) return cache.xml;

  const { url, anonKey } = environment.supabase;
  if (!url || !anonKey) throw new Error('Supabase no configurado');

  const params = new URLSearchParams({ select: 'slug,updated_at', is_published: 'eq.true', order: 'legacy_id.asc.nullslast,name.asc' });
  const respuesta = await fetch(`${url}/rest/v1/products?${params}`, {
    headers: { apikey: anonKey, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000)
  });
  if (!respuesta.ok) throw new Error(`Supabase respondió ${respuesta.status}`);
  const filas = (await respuesta.json()) as FilaSitemap[];

  const entradas = [
    { loc: `${origen}/`, lastmod: null },
    { loc: `${origen}/catalogo`, lastmod: null },
    { loc: `${origen}/sucursales`, lastmod: null },
    ...filas.map(f => ({
      loc: `${origen}/producto/${encodeURIComponent(f.slug)}`,
      lastmod: f.updated_at ? f.updated_at.slice(0, 10) : null
    }))
  ];

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entradas
      .map(e => `  <url><loc>${escapar(e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`)
      .join('\n') +
    '\n</urlset>\n';

  cache = { origen, xml, hasta: Date.now() + TTL_MS };
  return xml;
}
