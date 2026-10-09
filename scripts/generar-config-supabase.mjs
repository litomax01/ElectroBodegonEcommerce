#!/usr/bin/env node
/**
 * Genera src/environments/supabase.generated.ts a partir de variables de entorno.
 * Ese archivo está en .gitignore: los valores reales nunca se versionan.
 *
 * Variables:
 *   SUPABASE_URL              https://<project-ref>.supabase.co
 *   SUPABASE_PUBLISHABLE_KEY  clave PÚBLICA sb_publishable_... (recomendada)
 *   SUPABASE_ANON_KEY         alternativa heredada (anon JWT); se usa solo si falta la anterior
 *   SITE_URL                  origen público del sitio (https://dominio.com), opcional
 *   GA4_MEASUREMENT_ID        G-XXXXXXXXXX, opcional (sin valor no se carga Google Analytics)
 *   META_PIXEL_ID             id numérico del Pixel de Meta, opcional (sin valor no se carga)
 *
 * Origen (por prioridad):
 *   1. Variables del proceso (Vercel, Netlify, CI, terminal).
 *   2. Archivo .env en la raíz del proyecto (desarrollo local; ignorado por git).
 *
 * Se ejecuta solo en: npm install (postinstall), npm start, npm run build, npm run watch.
 * Si faltan las variables se genera una configuración vacía y la app usa productos.json.
 * Si se detecta una clave secreta (service_role / sb_secret_), el build FALLA.
 *
 * Sin dependencias: solo Node (>= 20.12 por process.loadEnvFile).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destino = resolve(raiz, 'src/environments/supabase.generated.ts');
const archivoEnv = resolve(raiz, '.env');

// .env NO sobrescribe variables ya definidas (las del hosting tienen prioridad)
if (existsSync(archivoEnv) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(archivoEnv);
}

const url = (process.env.SUPABASE_URL ?? '').trim();
const anonKey = (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

// ---- Sitio / analítica (todo opcional; sin valor = función desactivada) ----
//   SITE_URL              https://dominio-definitivo.com   (canonical, Open Graph, sitemap)
//   GA4_MEASUREMENT_ID    G-XXXXXXXXXX
//   META_PIXEL_ID         solo dígitos
const siteUrl = (process.env.SITE_URL ?? '').trim().replace(/\/+$/, '');
const ga4Id = (process.env.GA4_MEASUREMENT_ID ?? '').trim();
const metaPixelId = (process.env.META_PIXEL_ID ?? '').trim();

function rolDeJwt(token) {
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8'))?.role ?? null;
  } catch {
    return null;
  }
}

function fallar(mensaje) {
  console.error(`\n[supabase] ERROR: ${mensaje}\n`);
  process.exit(1);
}

// Barrera 1 (build). La barrera 2 está en SupabaseService (navegador).
if (anonKey.startsWith('sb_secret_') || rolDeJwt(anonKey) === 'service_role') {
  fallar('La clave pública contiene una clave SECRETA (service_role / sb_secret_). ' +
    'Usa la clave pública (anon / sb_publishable_). No se generó la configuración.');
}
if (url && !/^https:\/\//i.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(url)) {
  fallar('SUPABASE_URL debe empezar por https:// (http solo para Supabase local).');
}

if (siteUrl && !/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(siteUrl) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(siteUrl)) {
  fallar('SITE_URL debe ser un origen https:// sin ruta (ej. https://electrobodegon.com).');
}
if (ga4Id && !/^G-[A-Z0-9]{6,14}$/.test(ga4Id)) {
  fallar('GA4_MEASUREMENT_ID no tiene el formato esperado (G-XXXXXXXXXX).');
}
if (metaPixelId && !/^\d{8,20}$/.test(metaPixelId)) {
  fallar('META_PIXEL_ID debe contener solo dígitos.');
}

const contenido =
`// ARCHIVO GENERADO por scripts/generar-config-supabase.mjs — NO editar ni versionar.
// Para cambiar los valores define SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY (ver .env.example).
import { SitePublicConfig, SupabasePublicConfig } from './environment.model';

export const SUPABASE_PUBLIC_CONFIG: SupabasePublicConfig = ${JSON.stringify({ url, anonKey }, null, 2)};

export const SITE_PUBLIC_CONFIG: SitePublicConfig = ${JSON.stringify({ siteUrl, ga4Id, metaPixelId }, null, 2)};
`;

// Solo escribe si cambió (evita recompilaciones innecesarias en ng serve)
const anterior = existsSync(destino) ? readFileSync(destino, 'utf8') : null;
if (anterior !== contenido) writeFileSync(destino, contenido, 'utf8');

const tipoClave = !anonKey ? 'sin clave'
  : anonKey.startsWith('sb_publishable_') ? 'publishable'
  : rolDeJwt(anonKey) ?? 'formato desconocido';
console.log(url && anonKey
  ? `[supabase] Configuración generada (${new URL(url).host}, clave: ${tipoClave}).`
  : '[supabase] Sin SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY: la app usará los datos locales (productos.json).');
