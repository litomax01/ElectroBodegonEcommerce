/**
 * Configuración central de la tienda.
 * Único lugar donde se definen teléfonos, vendedores, sucursales y redes sociales.
 * En la Fase 2 estos datos se leerán desde Supabase (tablas sucursales / vendedores / configuracion_tienda).
 *
 * Nota: la app no usa URLs absolutas del propio sitio, por lo que el dominio
 * definitivo puede añadirse más adelante sin cambiar el código.
 */

import { MapLocation } from '../maps/map-embed.service';

export interface SucursalConfig {
  id: string;
  nombre: string;
  zona: string;
  /** Nombre corto usado en botones ("Norte", "Sur") */
  nombreCorto: string;
  direccion: string;
  telefono: string;
  asesorNombre: string;
  /** Etiqueta mostrada antes del nombre ("Asesora", "Asesor") */
  asesorTitulo: string;
  /** Número en formato internacional sin "+" ni espacios (ej. 593986952147) */
  whatsapp: string;
  /**
   * Ubicación para el mapa embebido: SOLO texto de búsqueda o coordenadas,
   * nunca una URL. La URL la construye MapEmbedService con dominio fijo.
   */
  mapa: MapLocation;
  horario: string;
  icon: string;
}

export interface RedesSociales {
  facebook: string;
  instagram: string;
  tiktok: string;
}

export const STORE_CONFIG = {
  nombre: 'Electro Bodegón',
  /** WhatsApp general (botón flotante, navbar) */
  whatsappPrincipal: '593986952147',
  // TODO: reemplazar por las URLs reales de las cuentas de la tienda
  redes: {
    facebook: 'https://facebook.com',
    instagram: 'https://instagram.com',
    tiktok: 'https://tiktok.com'
  } satisfies RedesSociales,
  sucursales: [
    {
      id: 'norte',
      nombre: 'Electro Bodegón Norte',
      zona: 'Sucursal Norte',
      nombreCorto: 'Norte',
      direccion: 'Av. Del Maestro y Sebastián Buara',
      telefono: '0986 952 147',
      asesorNombre: 'Elizabeth',
      asesorTitulo: 'Asesora',
      whatsapp: '593986952147',
      mapa: { tipo: 'busqueda', texto: 'Av. Del Maestro y Sebastián Buara' },
      horario: 'Lun – Sáb: 9:00 AM – 7:00 PM',
      icon: 'fas fa-map-marker-alt'
    },
    {
      id: 'sur',
      nombre: 'Electro Bodegón Sur',
      zona: 'Sucursal Sur',
      nombreCorto: 'Sur',
      direccion: 'Dr. José Peralta y Amaluza',
      telefono: '0958 771 384',
      asesorNombre: 'Fernando',
      asesorTitulo: 'Asesor',
      whatsapp: '593958771384',
      mapa: { tipo: 'busqueda', texto: 'Dr. José Peralta y Amaluza' },
      horario: 'Lun – Sáb: 9:00 AM – 7:00 PM',
      icon: 'fas fa-store'
    }
  ] as SucursalConfig[]
};

/** Construye un enlace wa.me codificando correctamente el mensaje. */
export function whatsappLink(numero: string, mensaje?: string): string {
  const base = 'https://wa.me/' + numero;
  return mensaje ? base + '?text=' + encodeURIComponent(mensaje) : base;
}
