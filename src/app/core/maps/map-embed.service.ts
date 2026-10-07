import { Injectable, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

/**
 * Ubicación de un mapa. NUNCA es una URL: solo texto de búsqueda o coordenadas.
 * Es el único formato que debe guardarse en la base de datos (tabla sucursales).
 */
export type MapLocation =
  | { tipo: 'busqueda'; texto: string }
  | { tipo: 'coordenadas'; lat: number; lng: number };

/** Origen y ruta fijos. Ningún dato externo puede alterar protocolo, dominio ni ruta. */
const GOOGLE_MAPS_ORIGIN = 'https://www.google.com';
const GOOGLE_MAPS_PATH = '/maps';
const MAX_TEXTO = 200;

/**
 * Servicio ÚNICO autorizado a usar `bypassSecurityTrustResourceUrl()` en la aplicación.
 *
 * ¿Por qué se usa el bypass?
 * Angular trata el `src` de un <iframe> como contexto RESOURCE_URL y no acepta
 * strings: exige un `SafeResourceUrl`, que solo se obtiene con el bypass.
 * La alternativa (asignar `iframe.src` directo en el DOM) también salta la
 * protección de Angular, pero de forma invisible y más difícil de auditar.
 *
 * Cómo se mantiene seguro:
 *  1. La entrada es `MapLocation` (texto o coordenadas), nunca una URL completa.
 *  2. El texto se valida (longitud, caracteres de control, rechazo de URLs/esquemas).
 *  3. Las coordenadas deben ser números finitos dentro de rango.
 *  4. La URL se construye con `new URL()` sobre un origen fijo y los datos van
 *     únicamente como parámetro `q` (codificado por URLSearchParams).
 *  5. Antes del bypass se verifica que el origen y la ruta resultantes sigan
 *     siendo exactamente los fijos.
 *
 * REGLA DEL PROYECTO: no usar `bypassSecurityTrust*` en ningún otro lugar,
 * y menos con contenido proveniente de Supabase. Si se necesita otro embed,
 * crear un servicio específico como este, con su propio origen fijo.
 */
@Injectable({ providedIn: 'root' })
export class MapEmbedService {
  private readonly sanitizer = inject(DomSanitizer);

  /** Devuelve la URL del iframe, o `null` si la ubicación no es válida. */
  embedUrl(ubicacion: MapLocation | null | undefined): SafeResourceUrl | null {
    const q = this.toQuery(ubicacion);
    if (q === null) return null;

    const url = new URL(GOOGLE_MAPS_PATH, GOOGLE_MAPS_ORIGIN);
    url.searchParams.set('q', q);
    url.searchParams.set('output', 'embed');

    // Defensa en profundidad: el destino debe seguir siendo exactamente Google Maps
    if (url.origin !== GOOGLE_MAPS_ORIGIN || url.pathname !== GOOGLE_MAPS_PATH) {
      return null;
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(url.toString());
  }

  private toQuery(ubicacion: MapLocation | null | undefined): string | null {
    if (!ubicacion) return null;

    if (ubicacion.tipo === 'coordenadas') {
      const { lat, lng } = ubicacion;
      const valido =
        typeof lat === 'number' && typeof lng === 'number' &&
        Number.isFinite(lat) && Number.isFinite(lng) &&
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
      return valido ? `${lat},${lng}` : null;
    }

    if (ubicacion.tipo === 'busqueda' && typeof ubicacion.texto === 'string') {
      const texto = ubicacion.texto.trim();
      if (texto.length === 0 || texto.length > MAX_TEXTO) return null;
      // Sin caracteres de control
      if (/[\u0000-\u001F\u007F]/.test(texto)) return null;
      // Rechaza cualquier cosa con forma de URL o esquema (http:, javascript:, data:, //host…)
      if (/^[a-z][a-z0-9+.-]*:/i.test(texto) || texto.includes('://') || texto.startsWith('//')) return null;
      return texto;
    }

    return null;
  }
}
