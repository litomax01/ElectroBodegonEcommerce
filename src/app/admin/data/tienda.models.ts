/** Modelos y utilidades puras de "Tienda" (sucursales, asesores y ajustes generales) del panel. */

export const DIAS_SEMANA = [
  { clave: 'Monday', corto: 'Lun', largo: 'Lunes' },
  { clave: 'Tuesday', corto: 'Mar', largo: 'Martes' },
  { clave: 'Wednesday', corto: 'Mié', largo: 'Miércoles' },
  { clave: 'Thursday', corto: 'Jue', largo: 'Jueves' },
  { clave: 'Friday', corto: 'Vie', largo: 'Viernes' },
  { clave: 'Saturday', corto: 'Sáb', largo: 'Sábado' },
  { clave: 'Sunday', corto: 'Dom', largo: 'Domingo' }
] as const;

export interface AjustesTienda {
  store_name: string;
  main_whatsapp: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
}

export interface AsesorAdmin {
  id: string;
  name: string;
  title: string | null;
  whatsapp: string;
  /** Ruta de la foto en Storage (null = foto de respaldo de la tienda) */
  photo_path: string | null;
}

export interface SucursalAdmin {
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
  /** HH:mm */
  opens_at: string | null;
  closes_at: string | null;
  is_active: boolean;
  /** Asesor principal (el primero por orden). Una sucursal puede no tener. */
  asesor: AsesorAdmin | null;
}

export interface SucursalPayload {
  name: string;
  zone: string | null;
  short_name: string | null;
  address: string;
  phone_display: string | null;
  map_query: string | null;
  open_days: string[];
  opens_at: string;
  closes_at: string;
  opening_hours: string;
  is_active: boolean;
  asesor: { name: string; title: string | null; whatsapp: string } | null;
}

/** Cambio de foto del asesor al guardar una sucursal. */
export interface CambioFotoAsesor {
  archivo: File | null;
  quitar: boolean;
}

/**
 * Deja solo dígitos con código de país: "0986 952 147" → "593986952147", "+593 98 695 2147" → "593986952147".
 * Un número local ecuatoriano (10 dígitos con 0 inicial) recibe el prefijo 593.
 */
export function normalizarWhatsapp(entrada: string): string {
  let n = entrada.replace(/\D+/g, '');
  if (n.startsWith('00')) n = n.slice(2);
  if (/^0\d{9}$/.test(n)) n = '593' + n.slice(1);
  return n;
}

export const WHATSAPP_VALIDO = /^[0-9]{8,15}$/;

/** "09:00" → "9:00 AM", "19:30" → "7:30 PM" */
export function hora12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const sufijo = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${sufijo}`;
}

/** Texto público del horario a partir de los datos estructurados: "Lun – Sáb: 9:00 AM – 7:00 PM". */
export function textoHorario(dias: string[], abre: string, cierra: string): string {
  const idx = DIAS_SEMANA.map((d, i) => (dias.includes(d.clave) ? i : -1)).filter(i => i >= 0);
  if (idx.length === 0) return '';
  const corto = (i: number) => DIAS_SEMANA[i].corto;
  const consecutivos = idx.every((v, k) => k === 0 || v === idx[k - 1] + 1);
  let parteDias: string;
  if (idx.length === 1) parteDias = corto(idx[0]);
  else if (consecutivos && idx.length === 2) parteDias = `${corto(idx[0])} y ${corto(idx[1])}`;
  else if (consecutivos) parteDias = `${corto(idx[0])} – ${corto(idx[idx.length - 1])}`;
  else parteDias = idx.slice(0, -1).map(corto).join(', ') + ' y ' + corto(idx[idx.length - 1]);
  return `${parteDias}: ${hora12(abre)} – ${hora12(cierra)}`;
}
