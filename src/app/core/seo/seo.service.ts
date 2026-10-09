import { Injectable, RESPONSE_INIT, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { STORE_CONFIG } from '../config/store.config';

export type JsonLd = Record<string, unknown>;

export interface SeoPagina {
  /** Título completo de la pestaña (≈ 50–60 caracteres) */
  titulo: string;
  /** Meta description (≈ 120–160 caracteres) */
  descripcion: string;
  /** Ruta canónica SIN query ni dominio (ej. "/producto/mi-slug") */
  ruta: string;
  /** Imagen para redes: URL absoluta o ruta del sitio ("/logo.png") */
  imagen?: string;
  imagenAlt?: string;
  tipoOg?: 'website' | 'product';
  /** true → no indexar (404, buscadores internos...) */
  noindex?: boolean;
  /** Estado HTTP de la respuesta SSR (404 para recursos inexistentes) */
  estado?: number;
  jsonLd?: JsonLd[];
}

/** Imagen por defecto para compartir cuando una página no tiene una propia. */
export const IMAGEN_COMPARTIR_POR_DEFECTO = '/logo.png';

/**
 * SEO por página: title, description, canonical, Open Graph, Twitter Cards y JSON-LD.
 * Funciona igual en servidor (SSR, lo que ven los rastreadores y las vistas previas de
 * WhatsApp/Facebook) y en el navegador (navegación interna).
 *
 * El dominio sale de SITE_URL (build) y, si no está definido, del origen de la petición.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly responseInit = inject(RESPONSE_INIT, { optional: true });

  /** Origen público sin barra final. */
  origen(): string {
    const fijo = environment.site.siteUrl;
    if (fijo) return fijo;
    return (this.document.location?.origin ?? '').replace(/\/+$/, '');
  }

  /** Convierte una ruta o URL en URL absoluta (solo http/https). */
  absoluta(urlORuta: string): string {
    if (/^https?:\/\//i.test(urlORuta)) return urlORuta;
    if (!urlORuta.startsWith('/')) return '';
    return this.origen() + urlORuta;
  }

  set(p: SeoPagina): void {
    const url = this.absoluta(p.ruta);
    const imagen = this.absoluta(p.imagen ?? IMAGEN_COMPARTIR_POR_DEFECTO);
    const descripcion = recortar(p.descripcion, 160);

    this.title.setTitle(p.titulo);
    this.nombre('description', descripcion);
    this.nombre('robots', p.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large');

    this.propiedad('og:site_name', STORE_CONFIG.nombre);
    this.propiedad('og:locale', 'es_EC');
    this.propiedad('og:type', p.tipoOg ?? 'website');
    this.propiedad('og:title', p.titulo);
    this.propiedad('og:description', descripcion);
    if (url) this.propiedad('og:url', url);
    if (imagen) {
      this.propiedad('og:image', imagen);
      this.propiedad('og:image:alt', p.imagenAlt ?? p.titulo);
    } else {
      this.quitarPropiedad('og:image');
      this.quitarPropiedad('og:image:alt');
    }

    this.nombre('twitter:card', imagen ? 'summary_large_image' : 'summary');
    this.nombre('twitter:title', p.titulo);
    this.nombre('twitter:description', descripcion);
    if (imagen) this.nombre('twitter:image', imagen);
    else this.meta.removeTag("name='twitter:image'");

    this.canonical(p.noindex ? '' : url);
    this.jsonLd(p.jsonLd ?? []);

    // En SSR la respuesta HTTP lleva el estado real (404 para productos/páginas inexistentes)
    if (p.estado && this.responseInit) this.responseInit.status = p.estado;
  }

  private nombre(name: string, content: string): void {
    this.meta.updateTag({ name, content }, `name='${name}'`);
  }

  private propiedad(property: string, content: string): void {
    this.meta.updateTag({ property, content }, `property='${property}'`);
  }

  private quitarPropiedad(property: string): void {
    this.meta.removeTag(`property='${property}'`);
  }

  private canonical(url: string): void {
    const head = this.document.head;
    let enlace = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!url) {
      enlace?.remove();
      return;
    }
    if (!enlace) {
      enlace = this.document.createElement('link');
      enlace.setAttribute('rel', 'canonical');
      head.appendChild(enlace);
    }
    enlace.setAttribute('href', url);
  }

  private jsonLd(datos: JsonLd[]): void {
    const head = this.document.head;
    head.querySelectorAll('script[data-seo-ld]').forEach(n => n.remove());
    for (const dato of datos) {
      const script = this.document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('data-seo-ld', '');
      script.textContent = serializarJsonLd(dato);
      head.appendChild(script);
    }
  }
}

/** JSON seguro para incrustar en <script>: escapa "<" (evita cerrar la etiqueta con datos de la base). */
export function serializarJsonLd(dato: JsonLd): string {
  const ls = String.fromCharCode(0x2028);
  const ps = String.fromCharCode(0x2029);
  return JSON.stringify(dato).replace(/</g, '\\u003c').split(ls).join('\\u2028').split(ps).join('\\u2029');
}

/** Recorta en el último espacio antes del límite, con puntos suspensivos. */
export function recortar(texto: string, max: number): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  if (limpio.length <= max) return limpio;
  const corte = limpio.slice(0, max - 1);
  const espacio = corte.lastIndexOf(' ');
  return (espacio > max * 0.6 ? corte.slice(0, espacio) : corte).replace(/[\s,.;:–-]+$/, '') + '…';
}
