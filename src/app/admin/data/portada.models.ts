/** Modelos de la portada (carrusel) en el panel. */

export interface AjustesHero {
  hero_show_offers: boolean;
  hero_show_welcome: boolean;
  hero_show_promos: boolean;
  hero_show_advisors: boolean;
  hero_interval_secs: number;
}

export type LayoutBanner = 'texto_foto' | 'solo_imagen';
export type TemaBanner = 'rojo' | 'blanco';

export interface BannerAdmin {
  id: string;
  layout: LayoutBanner;
  theme: TemaBanner;
  eyebrow: string | null;
  title: string | null;
  body: string | null;
  button_label: string | null;
  button_link: string | null;
  image_path: string | null;
  image_alt: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface BannerPayload {
  layout: LayoutBanner;
  theme: TemaBanner;
  eyebrow: string | null;
  title: string | null;
  body: string | null;
  button_label: string | null;
  button_link: string | null;
  image_alt: string | null;
  is_active: boolean;
}

/** Destinos fijos del botón (el resto: categorías, marcas y "otro enlace"). */
export const DESTINOS_BASE: { valor: string; texto: string }[] = [
  { valor: '/catalogo', texto: 'Catálogo completo' },
  { valor: '/catalogo?orden=descuento', texto: 'Productos en oferta (mayor descuento primero)' },
  { valor: '/sucursales', texto: 'Sucursales y contacto' }
];

export const VELOCIDADES = [
  { seg: 4, texto: 'Rápida (4 segundos)' },
  { seg: 7, texto: 'Normal (7 segundos)' },
  { seg: 10, texto: 'Lenta (10 segundos)' },
  { seg: 15, texto: 'Muy lenta (15 segundos)' }
];

export type ClaveSlide = 'ofertas' | 'bienvenida' | 'promos' | 'asesoria';
export type ClaveSlideConFotos = 'ofertas' | 'bienvenida' | 'promos';

/** Textos personalizados guardados de una diapositiva automática (campo null = original). */
export interface SlideAdmin {
  slide_key: ClaveSlide;
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  bullets: string[] | null;
  button_label: string | null;
}

export type SlidePayload = Omit<SlideAdmin, 'slide_key'>;

/** Foto propia que reemplaza una posición ("ofertas:2" = segunda foto de la vitrina). */
export interface FotoPropia {
  path: string;
  url: string;
}
