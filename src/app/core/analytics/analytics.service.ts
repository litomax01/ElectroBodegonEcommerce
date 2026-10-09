import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '../../../environments/environment';

type Parametros = Record<string, string | number | boolean>;

interface VentanaAnalitica extends Window {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown; callMethod?: (...args: unknown[]) => void };
  _fbq?: unknown;
}

/**
 * Analítica (Google Analytics 4 y Meta Pixel).
 *
 * - Totalmente configurable: los identificadores salen de GA4_MEASUREMENT_ID y META_PIXEL_ID
 *   (variables de entorno del build). Sin identificador NO se carga ningún script de terceros.
 * - Solo en el navegador y nunca en /admin.
 * - Registra vistas de página en la navegación interna (la app es una SPA) y los clics en
 *   enlaces de WhatsApp (sin enviar el texto del mensaje).
 *
 * Nota legal: si la normativa aplicable exige consentimiento previo de cookies, añadir un aviso
 * y llamar a iniciar() solo tras la aceptación (ver docs/produccion.md).
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));
  private iniciado = false;

  get activo(): boolean {
    return !!environment.site.ga4Id || !!environment.site.metaPixelId;
  }

  iniciar(): void {
    if (this.iniciado || !this.navegador || !this.activo) return;
    this.iniciado = true;

    const ventana = this.document.defaultView as VentanaAnalitica | null;
    if (!ventana) return;
    const { ga4Id, metaPixelId } = environment.site;

    if (ga4Id) this.cargarGa4(ventana, ga4Id);
    if (metaPixelId) this.cargarPixel(ventana, metaPixelId);

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => {
        const ruta = e.urlAfterRedirects.split(/[?#]/)[0];
        if (ruta === '/admin' || ruta.startsWith('/admin/')) return;
        this.vistaDePagina(ventana, ruta);
      });

    // Clics en WhatsApp (delegación: sirve para tarjetas, ficha, navbar y botón flotante)
    this.document.addEventListener(
      'click',
      ev => {
        const enlace = (ev.target as Element | null)?.closest?.('a[href^="https://wa.me/"]');
        if (enlace) this.evento(ventana, 'whatsapp_click', { pagina: ventana.location.pathname }, 'Contact');
      },
      { capture: true }
    );
  }

  private vistaDePagina(v: VentanaAnalitica, ruta: string): void {
    v.gtag?.('event', 'page_view', { page_path: ruta, page_title: this.document.title });
    v.fbq?.('track', 'PageView');
  }

  private evento(v: VentanaAnalitica, nombre: string, params: Parametros, eventoPixel?: string): void {
    v.gtag?.('event', nombre, params);
    if (eventoPixel) v.fbq?.('track', eventoPixel);
  }

  private cargarGa4(v: VentanaAnalitica, id: string): void {
    v.dataLayer = v.dataLayer ?? [];
    v.gtag = function gtag(...args: unknown[]) {
      v.dataLayer!.push(args);
    };
    v.gtag('js', new Date());
    // Las vistas de página se envían a mano en cada navegación
    v.gtag('config', id, { send_page_view: false });
    this.insertarScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`);
  }

  private cargarPixel(v: VentanaAnalitica, id: string): void {
    if (!v.fbq) {
      const fbq = function (...args: unknown[]) {
        if (fbq.callMethod) fbq.callMethod(...args);
        else fbq.queue.push(args);
      } as NonNullable<VentanaAnalitica['fbq']> & { queue: unknown[] };
      fbq.queue = [];
      fbq.loaded = true;
      fbq.version = '2.0';
      fbq.push = fbq;
      v.fbq = fbq;
      v._fbq = v._fbq ?? fbq;
    }
    v.fbq('init', id);
    this.insertarScript('https://connect.facebook.net/en_US/fbevents.js');
  }

  private insertarScript(src: string): void {
    const script = this.document.createElement('script');
    script.async = true;
    script.src = src;
    this.document.head.appendChild(script);
  }
}
