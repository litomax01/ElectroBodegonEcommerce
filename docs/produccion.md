# Producción: SEO, hosting y entrega

## Arquitectura

- **Angular 21 con SSR** (servidor Node/Express, `src/server.ts`) e hidratación.
  Las páginas públicas se renderizan en cada petición con datos frescos de Supabase: un producto
  nuevo, un cambio de precio o ocultar un producto se ven **sin volver a desplegar**.
- `/admin/**` se sirve como SPA (sin SSR), con `Cache-Control: no-store` y `X-Robots-Tag: noindex`.
- La tienda lee Supabase por REST con la clave **publicable** (`SupabaseRestService`); `supabase-js`
  solo se carga en el panel /admin.
- ¿Por qué SSR y no solo SPA? Las vistas previas de **WhatsApp, Facebook, X** y los buscadores leen el
  HTML inicial: con SSR cada producto comparte su nombre, precio e imagen reales.

## Variables de entorno

| Variable | Cuándo | Obligatoria | Para qué |
|---|---|---|---|
| `SUPABASE_URL` | build | sí | URL del proyecto |
| `SUPABASE_PUBLISHABLE_KEY` | build | sí | clave **publicable** (`sb_publishable_…`). Nunca `service_role`/`sb_secret_`: el build falla |
| `SITE_URL` | build **y** runtime | recomendada | dominio definitivo (`https://dominio.com`, sin barra final). Canonical, Open Graph, schema.org, sitemap |
| `NG_ALLOWED_HOSTS` | runtime | sí en producción | dominios aceptados, separados por comas (`dominio.com,www.dominio.com`; admite `*.vercel.app`). Protección SSRF de Angular SSR |
| `GA4_MEASUREMENT_ID` | build | no | `G-XXXXXXXXXX`. Vacío = no se carga Google Analytics |
| `META_PIXEL_ID` | build | no | solo dígitos. Vacío = no se carga el Pixel |

Ver `.env.example`. Cambiar cualquier variable de *build* exige un nuevo despliegue.

## Hosting recomendado

**Primera opción: Vercel** (plan gratuito, despliegue por Git, dominios y previews).
El repositorio ya trae `vercel.json` y `api/index.mjs`:

1. Importar el repositorio en Vercel. *Framework Preset*: **Other** (el `vercel.json` ya lo fija).
2. Variables de entorno del proyecto: las de la tabla (todas en *Production*).
3. Desplegar. Vercel ejecuta `npm run build`, sirve `dist/ElectroBodegon/browser` desde su CDN y
   envía el resto de peticiones a la función `api/index.mjs` (el servidor Angular).
4. Añadir el dominio (Settings → Domains) y ponerlo en `SITE_URL` y `NG_ALLOWED_HOSTS`; redesplegar.

> **Desplegado y probado** (2026-10-12) en `https://electro-bodegon.vercel.app`. Dos trampas resueltas:
> 1. Vercel envía `X-Forwarded-*`; Angular SSR, si no los declara de confianza, vuelve a renderizar en el
>    navegador y entrega el shell vacío. Se resolvió con `trustProxyHeaders` en `src/server.ts`
>    (el `Host` se sigue validando con `NG_ALLOWED_HOSTS`).
> 2. Vercel sirve `/` como archivo estático (`index.csr.html`) antes de aplicar `rewrites`. Por eso
>    `vercel.json` usa `routes` con `^/$ → /api/index` antes del sistema de archivos.
>
> Variables en Vercel (Production y Preview): `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` y
> `NG_ALLOWED_HOSTS=*.vercel.app`. Al añadir el dominio propio, sumar `SITE_URL` y el dominio en
> `NG_ALLOWED_HOSTS` y redesplegar (`npx vercel --prod`).

**Alternativa portable: contenedor Node** (Render, Railway, Fly.io, Cloud Run, un VPS). Usa el
`Dockerfile` incluido (ver sus comentarios para los `--build-arg`). Arranca con
`node dist/ElectroBodegon/server/server.mjs` (puerto `PORT`, por defecto 4000).

**No recomendadas** para esta arquitectura:
- *GitHub Pages*: solo estático; no hay SSR, ni `robots.txt`/`sitemap.xml` dinámicos, ni cabeceras, ni
  rutas directas sin trucos. (El script de despliegue a Pages ya se había descartado.)
- *Netlify*: su SSR de Angular corre en Edge Functions y **ignora las rutas Express** de `server.ts`
  (`/robots.txt`, `/sitemap.xml`, cabeceras de seguridad). Habría que rehacerlas aparte.
- *Cloudflare Pages/Workers*: requiere adaptar el servidor a `workerd`; más trabajo sin beneficio aquí.

## SEO implementado

- `SeoService`: title, meta description, canonical, Open Graph, Twitter Cards y JSON-LD por página
  (también en el HTML del servidor). Dominio desde `SITE_URL` (o el host validado de la petición).
- schema.org (solo con datos reales de `store.config.ts` y de la base de datos):
  `Organization` + `ElectronicsStore` por sucursal (dirección, teléfono, horario), `WebSite` con
  `SearchAction`, `Product` + `Offer` (precio USD; `availability` solo si el producto la tiene) y
  `BreadcrumbList`.
- `/robots.txt` y `/sitemap.xml` dinámicos (`src/server/seo-files.ts`): el sitemap incluye los productos
  publicados y se cachea 10 min. Para dominios no autorizados el sitemap responde 404.
- 404 reales (HTTP 404 + `noindex`) para productos y rutas inexistentes; el catálogo con filtros usa
  canonical `/catalogo`.
- Después del lanzamiento: dar de alta el sitio en **Google Search Console** y enviar `https://dominio/sitemap.xml`.

## Seguridad

- Cabeceras (`src/server/security-headers.ts`): CSP, `X-Content-Type-Options`, `X-Frame-Options: DENY`,
  `Referrer-Policy`, `Permissions-Policy`, `COOP` y HSTS (solo bajo HTTPS).
- **CSP**: `script-src`/`style-src` llevan `'unsafe-inline'` porque Angular SSR inyecta el script de
  reanudación de eventos y CSS crítico en línea; pasar a *nonces* es una mejora futura. `frame-src`
  solo permite `https://www.google.com` (mapas de las sucursales). Los orígenes de GA4/Meta se añaden
  únicamente si hay IDs configurados.
- Solo clave publicable en el frontend; `.env` y `supabase.generated.ts` fuera de git; registro público
  de Supabase desactivado; la autorización real es RLS + `admin_users`.
- `bypassSecurityTrust*` solo existe en `MapEmbedService`.
- Font Awesome se carga de cdnjs con **SRI** (el navegador rechaza el archivo si cambia).

## Analítica (preparada, desactivada)

`AnalyticsService` carga Google Analytics 4 y/o el Pixel de Meta **solo si** existen
`GA4_MEASUREMENT_ID` / `META_PIXEL_ID`. Registra vistas de página (navegación interna) y clics en
enlaces de WhatsApp; nunca en `/admin`. Si la normativa aplicable exige consentimiento previo de
cookies, hay que añadir un aviso y llamar a `iniciar()` solo tras aceptarlo.

## Rendimiento

- Paquete inicial **431 kB** (antes 680 kB): `supabase-js` salió de la tienda, y Catálogo y Sucursales
  se cargan bajo demanda.
- Fuentes de Google en versión variable (12 `@font-face` en lugar de 58).
- Las fotos que se suban desde /admin se reducen a 1600 px y se recodifican en WebP antes de ir a Storage.
- Los datos obtenidos en el servidor viajan en el HTML y el navegador los reutiliza (sin segunda descarga).
- Cachés: archivos con hash 1 año `immutable`; HTML 60 s en CDN con revalidación en segundo plano.

## Pendiente de datos reales (no inventado)

- **Redes sociales**: `STORE_CONFIG.redes` está vacío; mientras tanto no se muestran iconos ni `sameAs`.
- **Dominio** y **IDs de GA4 / Meta Pixel**.
- **Imagen para compartir** dedicada (1200×630); hoy se usa el logo.
- **Ciudad / código postal / coordenadas** de las sucursales (el schema solo lleva calle y país `EC`).
- **Fotografías reales**: `docs/productos-sin-foto-real.md` (5 productos con imagen rota y el resto con imágenes genéricas).
- Disponibilidad/stock de los productos (no se publica en schema.org mientras no exista).

## Verificación posterior al despliegue

```bash
curl -sI https://DOMINIO/                      # 200 + cabeceras de seguridad
curl -s  https://DOMINIO/robots.txt            # Disallow /admin + línea Sitemap
curl -s  https://DOMINIO/sitemap.xml | head    # URLs con el dominio real
curl -sI https://DOMINIO/producto/no-existe    # HTTP 404
curl -sI https://DOMINIO/admin/login           # Cache-Control: no-store
```

Y pegar un enlace de producto en WhatsApp para comprobar la vista previa.
