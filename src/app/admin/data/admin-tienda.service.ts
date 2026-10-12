import { Injectable, inject } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { ErrorAdmin } from './admin-catalogo.service';
import { optimizarImagen } from './optimizar-imagen';
import { TAMANO_MAX_IMAGEN, TIPOS_IMAGEN_PERMITIDOS } from './admin.models';
import { AjustesTienda, AsesorAdmin, CambioFotoAsesor, SucursalAdmin, SucursalPayload } from './tienda.models';

const BUCKET = 'catalog-media';

interface BranchRow {
  id: string;
  code: string;
  name: string;
  zone: string | null;
  short_name: string | null;
  address: string;
  phone_display: string | null;
  opening_hours: string | null;
  map_query: string | null;
  open_days: string[] | null;
  opens_at: string | null;
  closes_at: string | null;
  is_active: boolean;
  sort_order: number;
  sellers: (AsesorAdmin & { sort_order: number })[] | null;
}

const SELECT_BRANCH = `
  id, code, name, zone, short_name, address, phone_display, opening_hours, map_query,
  open_days, opens_at, closes_at, is_active, sort_order,
  sellers ( id, name, title, whatsapp, sort_order, photo_path )
`;

/**
 * Sucursales, asesores y ajustes generales desde el panel. Usa la sesión del administrador
 * (RLS decide quién escribe). No crea ni elimina sucursales ni la fila de ajustes.
 */
@Injectable({ providedIn: 'root' })
export class AdminTiendaService {
  private readonly supabase = inject(SupabaseService);

  private get db(): SupabaseClient {
    return this.supabase.client;
  }

  async obtenerAjustes(): Promise<AjustesTienda | null> {
    const { data, error } = await this.db
      .from('store_settings')
      .select('store_name, main_whatsapp, facebook_url, instagram_url, tiktok_url')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw this.traducir(error);
    return (data as AjustesTienda | null) ?? null;
  }

  async listarSucursales(): Promise<SucursalAdmin[]> {
    const { data, error } = await this.db
      .from('branches')
      .select(SELECT_BRANCH)
      .order('sort_order')
      .order('name');
    if (error) throw this.traducir(error);
    return ((data ?? []) as unknown as BranchRow[]).map(b => {
      const asesor = [...(b.sellers ?? [])].sort((x, y) => x.sort_order - y.sort_order)[0] ?? null;
      const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);
      return {
        id: b.id,
        code: b.code,
        name: b.name,
        zone: b.zone,
        short_name: b.short_name,
        address: b.address,
        phone_display: b.phone_display,
        opening_hours: b.opening_hours,
        map_query: b.map_query,
        open_days: b.open_days,
        opens_at: hhmm(b.opens_at),
        closes_at: hhmm(b.closes_at),
        is_active: b.is_active,
        asesor: asesor
          ? { id: asesor.id, name: asesor.name, title: asesor.title, whatsapp: asesor.whatsapp, photo_path: asesor.photo_path ?? null }
          : null
      };
    });
  }

  async guardarAjustes(a: AjustesTienda): Promise<void> {
    const { data, error } = await this.db.from('store_settings').update(a).eq('id', 1).select('id');
    if (error) throw this.traducir(error);
    if (!data?.length) {
      throw new ErrorAdmin('Faltan los datos iniciales de la tienda en la base de datos. Avisa a quien administra el sitio.');
    }
  }

  urlFoto(ruta: string | null): string | null {
    return ruta ? this.db.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl : null;
  }

  validarFoto(a: File): string | null {
    if (!TIPOS_IMAGEN_PERMITIDOS.includes(a.type)) return 'Formato no permitido: usa JPG, PNG, WebP o AVIF.';
    if (a.size === 0) return 'El archivo está vacío.';
    if (a.size > TAMANO_MAX_IMAGEN) return 'La imagen supera los 5 MB.';
    return null;
  }

  async guardarSucursal(s: SucursalAdmin, p: SucursalPayload, foto: CambioFotoAsesor = { archivo: null, quitar: false }): Promise<void> {
    const { asesor, ...campos } = p;
    const { data, error } = await this.db.from('branches').update(campos).eq('id', s.id).select('id');
    if (error) throw this.traducir(error);
    if (!data?.length) throw new ErrorAdmin('No se pudo guardar la sucursal.');
    if (!asesor) return;

    const idAsesor = s.asesor?.id ?? crypto.randomUUID();
    let ruta = s.asesor?.photo_path ?? null;
    let rutaNueva: string | null = null;
    if (foto.archivo) {
      rutaNueva = await this.subirFoto(idAsesor, foto.archivo);
      ruta = rutaNueva;
    } else if (foto.quitar) {
      ruta = null;
    }

    const fila = { ...asesor, photo_path: ruta };
    const r = s.asesor
      ? await this.db.from('sellers').update(fila).eq('id', s.asesor.id).select('id')
      : await this.db.from('sellers').insert({ id: idAsesor, ...fila, branch_id: s.id, sort_order: 1 }).select('id');
    if (r.error || !r.data?.length) {
      if (rutaNueva) await this.db.storage.from(BUCKET).remove([rutaNueva]);
      throw r.error ? this.traducir(r.error) : new ErrorAdmin('No se pudo guardar el asesor.');
    }
    const anterior = s.asesor?.photo_path ?? null;
    if (anterior && anterior !== ruta) await this.db.storage.from(BUCKET).remove([anterior]); // best effort
  }

  private async subirFoto(idAsesor: string, original: File): Promise<string> {
    const problema = this.validarFoto(original);
    if (problema) throw new ErrorAdmin(problema);
    const archivo = await optimizarImagen(original);
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' }[archivo.type] ?? 'jpg';
    const ruta = `sellers/${idAsesor}/${crypto.randomUUID()}.${ext}`;
    const { error } = await this.db.storage
      .from(BUCKET)
      .upload(ruta, archivo, { contentType: archivo.type, cacheControl: '31536000', upsert: false });
    if (error) {
      if (/row-level security|unauthorized|403/i.test(error.message)) throw new ErrorAdmin('No tienes permiso para subir imágenes.');
      throw new ErrorAdmin('No se pudo subir la foto. Inténtalo de nuevo.');
    }
    return ruta;
  }

  private traducir(error: { code?: string; message: string; details?: string }): ErrorAdmin {
    const texto = `${error.message} ${error.details ?? ''}`;
    switch (error.code) {
      case '23514':
        if (texto.includes('whatsapp')) return new ErrorAdmin('El WhatsApp debe tener entre 8 y 15 dígitos, con código de país (ej. 593986952147).', error.code);
        if (texto.includes('urls')) return new ErrorAdmin('Los enlaces de redes deben empezar con https://', error.code);
        if (texto.includes('hours')) return new ErrorAdmin('El horario no es válido: la hora de cierre debe ser posterior a la de apertura.', error.code);
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
