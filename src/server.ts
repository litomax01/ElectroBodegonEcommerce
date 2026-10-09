import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { environment } from './environments/environment';
import { cabecerasSeguridad } from './server/security-headers';
import { construirSitemap, construirRobots } from './server/seo-files';

const browserDistFolder = join(import.meta.dirname, '../browser');

/**
 * Dominios desde los que se acepta tráfico (protección SSRF / Host header de Angular SSR).
 *  - localhost: desarrollo y pruebas locales.
 *  - SITE_URL (build o runtime) y NG_ALLOWED_HOSTS (lista separada por comas; admite "*.dominio.com").
 */
function dominiosPermitidos(): string[] {
  const lista = new Set<string>(['localhost', '127.0.0.1']);
  const sitio = process.env['SITE_URL'] || environment.site.siteUrl;
  if (sitio) {
    try {
      lista.add(new URL(sitio).hostname);
    } catch {
      /* SITE_URL inválida: se ignora (el generador ya la valida en el build) */
    }
  }
  for (const h of (process.env['NG_ALLOWED_HOSTS'] ?? '').split(',')) {
    const limpio = h.trim().toLowerCase();
    if (limpio) lista.add(limpio);
  }
  return [...lista];
}

const allowedHosts = dominiosPermitidos();
const app = express();
const angularApp = new AngularNodeAppEngine({ allowedHosts });

app.disable('x-powered-by');
// Detrás de un proxy/CDN (Vercel, Netlify, Render...) el protocolo real llega en X-Forwarded-Proto
app.set('trust proxy', true);

/** ¿El Host de la petición es uno de los permitidos? (comodines "*.dominio.com") */
function hostPermitido(hostHeader: string | undefined): boolean {
  if (!hostHeader) return false;
  const host = hostHeader.toLowerCase().replace(/:\d+$/, '');
  return allowedHosts.some(p =>
    p.startsWith('*.') ? host.endsWith(p.slice(1)) && host.length > p.length - 1 : host === p
  );
}

/** Origen público para sitemap/robots: SITE_URL si existe; si no, el Host validado de la petición. */
function origenPublico(req: express.Request): string | null {
  const fijo = (process.env['SITE_URL'] || environment.site.siteUrl || '').replace(/\/+$/, '');
  if (fijo) return fijo;
  const host = req.headers.host;
  if (!hostPermitido(host)) return null;
  return `${req.protocol}://${host}`;
}

// ---- Cabeceras de seguridad y caché ----
app.use((req, res, next) => {
  const https = req.protocol === 'https';
  for (const [clave, valor] of Object.entries(cabecerasSeguridad({ https }))) {
    // Solo para pruebas locales (ej. medir en iframes). Nunca definir esta variable en producción.
    if (clave === 'Content-Security-Policy' && process.env['DISABLE_CSP'] === '1') continue;
    res.setHeader(clave, valor);
  }
  // El panel nunca se cachea ni se indexa
  if (req.path === '/admin' || req.path.startsWith('/admin/')) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }
  next();
});

// ---- robots.txt y sitemap.xml (dinámicos: el dominio y los productos cambian sin redeploy) ----
app.get('/robots.txt', (req, res) => {
  res
    .type('text/plain; charset=utf-8')
    .set('Cache-Control', 'public, max-age=3600')
    .send(construirRobots(origenPublico(req)));
});

app.get('/sitemap.xml', async (req, res) => {
  const origen = origenPublico(req);
  if (!origen) {
    res.status(404).type('text/plain').send('Sitemap no disponible para este dominio.');
    return;
  }
  try {
    const xml = await construirSitemap(origen);
    res
      .type('application/xml; charset=utf-8')
      .set('Cache-Control', 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400')
      .send(xml);
  } catch (e) {
    console.error('[sitemap]', e);
    res.status(502).type('text/plain').send('No se pudo generar el sitemap.');
  }
});

/**
 * Archivos estáticos (/browser). Los que llevan hash en el nombre (main-XXXX.js, styles-XXXX.css)
 * son inmutables; el resto (logo, favicon) se cachea un día.
 */
app.use(
  express.static(browserDistFolder, {
    index: false,
    redirect: false,
    setHeaders: (res, ruta) => {
      const conHash = /-[A-Z0-9]{8}\.(js|css|woff2?)$/.test(ruta);
      res.setHeader(
        'Cache-Control',
        conHash ? 'public, max-age=31536000, immutable' : 'public, max-age=86400'
      );
    },
  }),
);

/**
 * Páginas: se renderizan en cada petición. En una CDN se reutilizan 60 s y se revalidan en
 * segundo plano (los cambios del panel se ven en ~1 min).
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => {
      if (!response) return next();
      if (!res.hasHeader('Cache-Control') && response.status === 200) {
        res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
      }
      return writeResponseToNodeResponse(response, res);
    })
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build), Vercel/Firebase functions, etc.
 */
export const reqHandler = createNodeRequestHandler(app);
