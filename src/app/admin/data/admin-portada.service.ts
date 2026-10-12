import { Injectable, inject } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { ErrorAdmin } from './admin-catalogo.service';
import { optimizarImagen } from './optimizar-imagen';
import { TAMANO_MAX_IMAGEN, TIPOS_IMAGEN_PERMITIDOS } from './admin.models';
import {
  AjustesHero,
  BannerAdmin,
  BannerPayload,
  ClaveSlide,
  ClaveSlideConFotos,
  FotoPropia,
  SlideAdmin,
  SlidePayload
} from './portada.models';

const BUCKET = 'catalog-media';
const SELECT_BANNER =
  'id, layout, theme, eyebrow, title, body, button_label, button_link, image_path, image_alt, sort_order, is_active';

/**
 * Portada del sitio desde el panel: interruptores de las diapositivas automáticas (store_settings)
 * y banners propios (home_banners + imágenes en catalog-media/banners/…).
 * Usa la sesión del administrador: RLS decide quién escribe.
 */
@Injectable({ providedIn: 'root' })
export class AdminPortadaService {
  private readonly supabase = inject(SupabaseService);

  private get db(): SupabaseClient {
    return this.supabase.client;
  }

  // ------------------------------------------------------------------ diapositivas automáticas

  async obtenerHero(): Promise<AjustesHero | null> {
    const { data, error } = await this.db
      .from('store_settings')
      .select('hero_show_offers, hero_show_welcome, hero_show_promos, hero_show_advisors, hero_interval_secs')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw this.traducir(error);
    return (data as AjustesHero | null) ?? null;
  }

  async guardarHero(h: AjustesHero): Promise<void> {
    const { data, error } = await this.db.from('store_settings').update(h).eq('id', 1).select('id');
    if (error) throw this.traducir(error);
    if (!data?.length) {
      throw new ErrorAdmin('Faltan los datos iniciales de la tienda en la base de datos. Avisa a quien administra el sitio.');
    }
  }

  // ------------------------------------------------------------------ banners propios

  async listarBanners(): Promise<BannerAdmin[]> {
    const { data, error } = await this.db
      .from('home_banners')
      .select(SELECT_BANNER)
      .order('sort_order')
      .order('created_at');
    if (error) throw this.traducir(error);
    return (data ?? []) as BannerAdmin[];
  }

  urlImagen(ruta: string | null): string | null {
    return ruta ? this.db.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl : null;
  }

  /** Crea un banner (sube la imagen primero; si falla el registro, la borra). */
  async crearBanner(p: BannerPayload, archivo: File | null, orden: number): Promise<BannerAdmin> {
    const id = crypto.randomUUID();
    const ruta = archivo ? await this.subirImagen(id, archivo) : null;
    const { data, error } = await this.db
      .from('home_banners')
      .insert({ id, ...p, image_path: ruta, sort_order: orden })
      .select(SELECT_BANNER)
      .single();
    if (error) {
      await this.borrarArchivo(ruta);
      throw this.traducir(error);
    }
    return data as BannerAdmin;
  }

  /** Actualiza un banner; si hay imagen nueva reemplaza (y borra) la anterior. */
  async actualizarBanner(b: BannerAdmin, p: BannerPayload, archivoNuevo: File | null, quitarImagen: boolean): Promise<BannerAdmin> {
    let ruta = b.image_path;
    let rutaNueva: string | null = null;
    if (archivoNuevo) {
      rutaNueva = await this.subirImagen(b.id, archivoNuevo);
      ruta = rutaNueva;
    } else if (quitarImagen) {
      ruta = null;
    }
    const { data, error } = await this.db
      .from('home_banners')
      .update({ ...p, image_path: ruta })
      .eq('id', b.id)
      .select(SELECT_BANNER)
      .maybeSingle();
    if (error || !data) {
      await this.borrarArchivo(rutaNueva);
      throw error ? this.traducir(error) : new ErrorAdmin('No se pudo guardar el banner.');
    }
    if (b.image_path && b.image_path !== ruta) await this.borrarArchivo(b.image_path);
    return data as BannerAdmin;
  }

  async cambiarActivo(id: string, activo: boolean): Promise<void> {
    const { data, error } = await this.db.from('home_banners').update({ is_active: activo }).eq('id', id).select('id');
    if (error) throw this.traducir(error);
    if (!data?.length) throw new ErrorAdmin('No se pudo actualizar el banner.');
  }

  /** Guarda el orden recibido (ids en el orden deseado). */
  async ordenar(idsEnOrden: string[]): Promise<void> {
    for (let i = 0; i < idsEnOrden.length; i++) {
      const { error } = await this.db.from('home_banners').update({ sort_order: i }).eq('id', idsEnOrden[i]);
      if (error) throw this.traducir(error);
    }
  }

  async eliminarBanner(b: BannerAdmin): Promise<void> {
    const { error } = await this.db.from('home_banners').delete().eq('id', b.id);
    if (error) throw this.traducir(error);
    await this.borrarArchivo(b.image_path);
  }

  // ------------------------------------------------------------------ diapositivas automáticas: textos

  async listarSlides(): Promise<Partial<Record<ClaveSlide, SlideAdmin>>> {
    const { data, error } = await this.db
      .from('hero_slides')
      .select('slide_key, eyebrow, title, subtitle, body, bullets, button_label');
    if (error) throw this.traducir(error);
    const r: Partial<Record<ClaveSlide, SlideAdmin>> = {};
    for (const f of (data ?? []) as SlideAdmin[]) r[f.slide_key] = f;
    return r;
  }

  /**
   * Guarda los textos de una diapositiva. Si todos los campos son null (= todo igual al original)
   * se borra la fila para que la tienda use directamente los textos originales.
   */
  async guardarSlide(clave: ClaveSlide, p: SlidePayload): Promise<void> {
    const todoOriginal = Object.values(p).every(v => v === null);
    if (todoOriginal) {
      const { error } = await this.db.from('hero_slides').delete().eq('slide_key', clave);
      if (error) throw this.traducir(error);
      return;
    }
    const { error } = await this.db.from('hero_slides').upsert({ slide_key: clave, ...p }, { onConflict: 'slide_key' });
    if (error) throw this.traducir(error);
  }

  // ------------------------------------------------------------------ diapositivas automáticas: fotos

  async listarFotos(): Promise<Record<string, FotoPropia>> {
    const { data, error } = await this.db.from('hero_slide_images').select('slide_key, slot, image_path');
    if (error) throw this.traducir(error);
    const r: Record<string, FotoPropia> = {};
    for (const f of (data ?? []) as { slide_key: string; slot: number; image_path: string }[]) {
      const url = this.urlImagen(f.image_path);
      if (url) r[`${f.slide_key}:${f.slot}`] = { path: f.image_path, url };
    }
    return r;
  }

  /** Sube una foto propia para esa posición (reemplaza la anterior, si había). */
  async ponerFoto(slide: ClaveSlideConFotos, slot: number, archivo: File, anterior: FotoPropia | null): Promise<void> {
    const ruta = await this.subirImagen(crypto.randomUUID(), archivo);
    const { error } = await this.db
      .from('hero_slide_images')
      .upsert({ slide_key: slide, slot, image_path: ruta }, { onConflict: 'slide_key,slot' });
    if (error) {
      await this.borrarArchivo(ruta);
      throw this.traducir(error);
    }
    if (anterior) await this.borrarArchivo(anterior.path);
  }

  /** Vuelve a la foto original de esa posición. */
  async quitarFoto(slide: ClaveSlideConFotos, slot: number, actual: FotoPropia): Promise<void> {
    const { error } = await this.db.from('hero_slide_images').delete().eq('slide_key', slide).eq('slot', slot);
    if (error) throw this.traducir(error);
    await this.borrarArchivo(actual.path);
  }

  /** Vuelve TODO lo de una diapositiva al original: textos y fotos. */
  async restaurarSlide(clave: ClaveSlide, fotos: FotoPropia[]): Promise<void> {
    const t = await this.db.from('hero_slides').delete().eq('slide_key', clave);
    if (t.error) throw this.traducir(t.error);
    if (clave !== 'asesoria') {
      const f = await this.db.from('hero_slide_images').delete().eq('slide_key', clave);
      if (f.error) throw this.traducir(f.error);
      for (const foto of fotos) await this.borrarArchivo(foto.path);
    }
  }

  // ------------------------------------------------------------------ imágenes

  validarArchivo(a: File): string | null {
    if (!TIPOS_IMAGEN_PERMITIDOS.includes(a.type)) return 'Formato no permitido: usa JPG, PNG, WebP o AVIF.';
    if (a.size === 0) return 'El archivo está vacío.';
    if (a.size > TAMANO_MAX_IMAGEN) return 'La imagen supera los 5 MB.';
    return null;
  }

  private async subirImagen(bannerId: string, original: File): Promise<string> {
    const problema = this.validarArchivo(original);
    if (problema) throw new ErrorAdmin(problema);
    const archivo = await optimizarImagen(original);
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' }[archivo.type] ?? 'jpg';
    const ruta = `banners/${bannerId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await this.db.storage
      .from(BUCKET)
      .upload(ruta, archivo, { contentType: archivo.type, cacheControl: '31536000', upsert: false });
    if (error) {
      if (/row-level security|unauthorized|403/i.test(error.message)) throw new ErrorAdmin('No tienes permiso para subir imágenes.');
      throw new ErrorAdmin('No se pudo subir la imagen. Inténtalo de nuevo.');
    }
    return ruta;
  }

  private async borrarArchivo(ruta: string | null): Promise<void> {
    if (!ruta) return;
    await this.db.storage.from(BUCKET).remove([ruta]); // best effort: un archivo huérfano no afecta a la tienda
  }

  private traducir(error: { code?: string; message: string; details?: string }): ErrorAdmin {
    const texto = `${error.message} ${error.details ?? ''}`;
    switch (error.code) {
      case '23514':
        if (texto.includes('link')) return new ErrorAdmin('El destino del botón no es válido: usa una opción de la lista o un enlace que empiece con https://', error.code);
        if (texto.includes('content')) return new ErrorAdmin('Falta contenido: "Solo imagen" necesita una imagen y "Texto y foto" necesita un título.', error.code);
        if (texto.includes('hero_slides')) return new ErrorAdmin('Algún texto es demasiado largo. Revisa los límites de cada campo.', error.code);
        if (texto.includes('interval')) return new ErrorAdmin('La velocidad debe estar entre 3 y 20 segundos.', error.code);
        return new ErrorAdmin('Algún dato no cumple las reglas de validación. Revisa el formulario.', error.code);
      case '42501':
        return new ErrorAdmin('No tienes permiso para realizar esta acción.', error.code);
      default:
        if (/jwt|token|expired/i.test(error.message)) return new ErrorAdmin('Tu sesión expiró. Vuelve a iniciar sesión.', error.code);
        if (/fetch|network/i.test(error.message)) return new ErrorAdmin('Sin conexión con el servidor. Inténtalo de nuevo.', error.code);
        return new ErrorAdmin('Ocurrió un error inesperado. Inténtalo de nuevo.', error.code);
    }
  }
}
