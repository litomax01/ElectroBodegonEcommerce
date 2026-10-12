import { Injectable, inject } from '@angular/core';
import { firstValueFrom, forkJoin, timeout } from 'rxjs';
import { SupabaseRestService } from '../supabase/supabase-rest.service';
import { MapLocation } from '../maps/map-embed.service';
import {
  ConfigTiendaRemota,
  HorarioAtencion,
  STORE_CONFIG,
  SucursalConfig,
  aplicarConfigRemota
} from './store.config';

/** Tiempo máximo de espera: si Supabase no responde, la tienda arranca con la config de respaldo. */
const ESPERA_MAX_MS = 4000;

const WHATSAPP = /^[0-9]{8,15}$/;
const URL_HTTPS = /^https:\/\/\S+$/;
const DIAS: HorarioAtencion['dias'] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export interface SellerRow {
  name: string;
  title: string | null;
  whatsapp: string;
  sort_order: number;
  photo_path: string | null;
}

export interface BranchRow {
  code: string;
  name: string;
  zone: string | null;
  short_name: string | null;
  address: string;
  phone_display: string | null;
  opening_hours: string | null;
  icon: string | null;
  map_query: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  open_days: string[] | null;
  opens_at: string | null;
  closes_at: string | null;
  sellers: SellerRow[] | null;
}

export interface SettingsRow {
  store_name: string;
  main_whatsapp: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  hero_show_offers: boolean;
  hero_show_welcome: boolean;
  hero_show_promos: boolean;
  hero_show_advisors: boolean;
  hero_interval_secs: number;
}

const SELECT_BRANCH = `
  code,name,zone,short_name,address,phone_display,opening_hours,icon,map_query,latitude,longitude,
  open_days,opens_at,closes_at,
  sellers ( name,title,whatsapp,sort_order,photo_path )
`;

/**
 * Carga sucursales, asesores y ajustes de la tienda desde Supabase (lectura pública) y los aplica
 * sobre STORE_CONFIG. Se ejecuta al arrancar la app (ver app.config.ts), por lo que el SSR ya
 * renderiza con los datos que edita el administrador y el navegador los reutiliza (TransferState).
 *
 * Nunca lanza: ante cualquier fallo se conserva la configuración de respaldo.
 */
@Injectable({ providedIn: 'root' })
export class StoreConfigRemotoService {
  private readonly api = inject(SupabaseRestService);

  async cargar(): Promise<void> {
    if (!this.api.isConfigured) return;
    try {
      const [sucursales, ajustes] = await firstValueFrom(
        forkJoin([
          this.api.select<BranchRow>('branches', {
            select: SELECT_BRANCH,
            is_active: 'eq.true',
            'sellers.is_active': 'eq.true',
            order: 'sort_order.asc,name.asc',
            'sellers.order': 'sort_order.asc'
          }),
          this.api.select<SettingsRow>('store_settings', {
            select:
              'store_name,main_whatsapp,facebook_url,instagram_url,tiktok_url,hero_show_offers,hero_show_welcome,hero_show_promos,hero_show_advisors,hero_interval_secs',
            limit: '1'
          })
        ]).pipe(timeout(ESPERA_MAX_MS))
      );
      aplicarConfigRemota(
        mapearConfigRemota(sucursales, ajustes[0] ?? null, ruta => this.api.urlPublica('catalog-media', ruta))
      );
    } catch (e) {
      console.warn('[tienda] No se pudo cargar la configuración remota; se usa la de respaldo.', e);
    }
  }
}

/** Fila de la base de datos → configuración de la tienda (valida de nuevo: no se confía en el origen). */
export function mapearConfigRemota(
  filas: BranchRow[],
  ajustes: SettingsRow | null,
  urlFoto: (ruta: string) => string = () => ''
): ConfigTiendaRemota {
  const respaldoWhatsapp = ajustes?.main_whatsapp && WHATSAPP.test(ajustes.main_whatsapp)
    ? ajustes.main_whatsapp
    : STORE_CONFIG.whatsappPrincipal;

  const sucursales = filas.map(f => mapearSucursal(f, respaldoWhatsapp, urlFoto));

  const url = (v: string | null | undefined) => (v && URL_HTTPS.test(v) ? v : '');
  return {
    nombre: ajustes?.store_name?.trim() || undefined,
    whatsappPrincipal: ajustes?.main_whatsapp && WHATSAPP.test(ajustes.main_whatsapp) ? ajustes.main_whatsapp : undefined,
    redes: ajustes
      ? { facebook: url(ajustes.facebook_url), instagram: url(ajustes.instagram_url), tiktok: url(ajustes.tiktok_url) }
      : undefined,
    hero: ajustes
      ? {
          mostrarOfertas: ajustes.hero_show_offers !== false,
          mostrarBienvenida: ajustes.hero_show_welcome !== false,
          mostrarPromos: ajustes.hero_show_promos !== false,
          mostrarAsesores: ajustes.hero_show_advisors !== false,
          intervaloSeg: Math.min(20, Math.max(3, Number(ajustes.hero_interval_secs) || 7))
        }
      : undefined,
    sucursales
  };
}

function mapearSucursal(f: BranchRow, whatsappRespaldo: string, urlFoto: (ruta: string) => string): SucursalConfig {
  const asesor = (f.sellers ?? [])
    .filter(s => WHATSAPP.test(s.whatsapp))
    .sort((a, b) => a.sort_order - b.sort_order)[0];

  const lat = f.latitude === null ? NaN : Number(f.latitude);
  const lng = f.longitude === null ? NaN : Number(f.longitude);
  const mapa: MapLocation =
    Number.isFinite(lat) && Number.isFinite(lng)
      ? { tipo: 'coordenadas', lat, lng }
      : { tipo: 'busqueda', texto: f.map_query?.trim() || f.address };

  return {
    id: f.code,
    nombre: f.name,
    zona: f.zone || f.name,
    nombreCorto: f.short_name || f.zone || f.name,
    direccion: f.address,
    telefono: f.phone_display ?? '',
    // Sin asesor activo: se atiende por el WhatsApp general (no se inventa un nombre de persona)
    asesorNombre: asesor?.name ?? 'Equipo Electro Bodegón',
    asesorTitulo: asesor ? asesor.title ?? 'Asesor' : 'Atención',
    asesorFoto: asesor?.photo_path ? urlFoto(asesor.photo_path) : '',
    whatsapp: asesor?.whatsapp ?? whatsappRespaldo,
    mapa,
    horario: f.opening_hours ?? '',
    horarioEstructurado: horarioDe(f),
    icon: f.icon || 'fas fa-store'
  };
}

function horarioDe(f: BranchRow): HorarioAtencion | null {
  if (!f.open_days || !f.opens_at || !f.closes_at) return null;
  const dias = DIAS.filter(d => f.open_days!.includes(d));
  if (dias.length === 0) return null;
  return { dias, abre: f.opens_at.slice(0, 5), cierra: f.closes_at.slice(0, 5) };
}
