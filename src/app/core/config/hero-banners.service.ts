import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, timeout } from 'rxjs';
import { SupabaseRestService } from '../supabase/supabase-rest.service';

export interface BannerPortada {
  id: string;
  layout: 'texto_foto' | 'solo_imagen';
  theme: 'rojo' | 'blanco';
  eyebrow: string;
  title: string;
  body: string;
  buttonLabel: string;
  /** Ruta interna ("/catalogo") o https://… ; '' = sin botón */
  buttonLink: string;
  /** URL pública de la imagen ('' si no tiene) */
  imageUrl: string;
  imageAlt: string;
}

/** Textos personalizados de una diapositiva automática. '' / [] = se usa el original de la tienda. */
export interface PersonalizacionSlide {
  eyebrow: string;
  title: string;
  subtitle: string;
  body: string;
  bullets: string[];
  buttonLabel: string;
}

export type ClaveSlide = 'ofertas' | 'bienvenida' | 'promos' | 'asesoria';

export interface PersonalizacionesHero {
  slides: Partial<Record<ClaveSlide, PersonalizacionSlide>>;
  /** URL pública de las fotos propias por posición ("ofertas:2"); sin clave = foto original */
  fotos: Record<string, string>;
}

interface SlideRow {
  slide_key: string;
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  bullets: string[] | null;
  button_label: string | null;
}

interface FotoRow {
  slide_key: string;
  slot: number;
  image_path: string;
}

const CLAVES: ClaveSlide[] = ['ofertas', 'bienvenida', 'promos', 'asesoria'];

interface BannerRow {
  id: string;
  layout: string;
  theme: string;
  eyebrow: string | null;
  title: string | null;
  body: string | null;
  button_label: string | null;
  button_link: string | null;
  image_path: string | null;
  image_alt: string | null;
}

const BUCKET = 'catalog-media';
const INTERNO = /^\/([^/\s][^\s]*)?$/;
const EXTERNO = /^https:\/\/\S+$/;

/**
 * Banners propios de la portada (tabla home_banners, solo los activos).
 * Si no hay o la consulta falla devuelve [] y el carrusel usa solo sus diapositivas automáticas.
 */
@Injectable({ providedIn: 'root' })
export class HeroBannersService {
  private readonly api = inject(SupabaseRestService);

  listar(): Observable<BannerPortada[]> {
    if (!this.api.isConfigured) return of([]);
    return this.api
      .select<BannerRow>('home_banners', {
        select: 'id,layout,theme,eyebrow,title,body,button_label,button_link,image_path,image_alt',
        is_active: 'eq.true',
        order: 'sort_order.asc,created_at.asc'
      })
      .pipe(
        timeout(4000),
        map(filas => filas.map(f => this.mapear(f)).filter((b): b is BannerPortada => b !== null)),
        catchError(() => of([] as BannerPortada[]))
      );
  }

  /** Textos y fotos que el administrador cambió de las diapositivas automáticas. */
  personalizaciones(): Observable<PersonalizacionesHero> {
    const vacio: PersonalizacionesHero = { slides: {}, fotos: {} };
    if (!this.api.isConfigured) return of(vacio);
    return forkJoin([
      this.api.select<SlideRow>('hero_slides', {
        select: 'slide_key,eyebrow,title,subtitle,body,bullets,button_label'
      }),
      this.api.select<FotoRow>('hero_slide_images', { select: 'slide_key,slot,image_path' })
    ]).pipe(
      timeout(4000),
      map(([filas, fotos]) => {
        const r: PersonalizacionesHero = { slides: {}, fotos: {} };
        const t = (v: string | null) => (v ?? '').trim();
        for (const f of filas) {
          const clave = CLAVES.find(c => c === f.slide_key);
          if (!clave) continue;
          r.slides[clave] = {
            eyebrow: t(f.eyebrow),
            title: t(f.title),
            subtitle: t(f.subtitle),
            body: t(f.body),
            bullets: (f.bullets ?? []).map(b => b.trim()).filter(Boolean).slice(0, 4),
            buttonLabel: t(f.button_label)
          };
        }
        for (const f of fotos) {
          if (!f.image_path) continue;
          r.fotos[`${f.slide_key}:${f.slot}`] = this.api.urlPublica(BUCKET, f.image_path);
        }
        return r;
      }),
      catchError(() => of(vacio))
    );
  }

  private mapear(f: BannerRow): BannerPortada | null {
    const layout = f.layout === 'solo_imagen' ? 'solo_imagen' : 'texto_foto';
    const imageUrl = f.image_path ? this.api.urlPublica(BUCKET, f.image_path) : '';
    const link = f.button_link && (INTERNO.test(f.button_link) || EXTERNO.test(f.button_link)) ? f.button_link : '';
    const titulo = (f.title ?? '').trim();
    // Sin contenido mostrable no se publica (la base de datos ya lo impide; defensa extra)
    if (layout === 'solo_imagen' && !imageUrl) return null;
    if (layout === 'texto_foto' && !titulo) return null;
    return {
      id: f.id,
      layout,
      theme: f.theme === 'blanco' ? 'blanco' : 'rojo',
      eyebrow: (f.eyebrow ?? '').trim(),
      title: titulo,
      body: (f.body ?? '').trim(),
      buttonLabel: (f.button_label ?? '').trim(),
      buttonLink: link,
      imageUrl,
      imageAlt: (f.image_alt ?? '').trim()
    };
  }
}
