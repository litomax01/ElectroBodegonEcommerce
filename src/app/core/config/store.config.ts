/**
 * Configuración central de la tienda.
 * Único lugar donde se definen teléfonos, vendedores, sucursales, horarios y redes sociales:
 * navbar, footer, páginas, WhatsApp y los datos estructurados (schema.org) salen de aquí.
 * En una fase posterior estos datos pueden leerse desde Supabase (tablas branches / sellers / store_settings).
 *
 * Nota: la app no escribe URLs absolutas del propio sitio en el código: el dominio definitivo
 * se define con la variable de entorno SITE_URL (ver .env.example).
 */

import { MapLocation } from '../maps/map-embed.service';

/** Horario estructurado (para schema.org). `horario` es el texto que se muestra al público. */
export interface HorarioAtencion {
  /** Días en formato schema.org */
  dias: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday')[];
  /** HH:mm (24 h) */
  abre: string;
  cierra: string;
}

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
  horarioEstructurado: HorarioAtencion;
  icon: string;
}

/** URLs de perfiles. Cadena vacía = PENDIENTE: no se muestra el icono ni se publica en schema.org. */
export interface RedesSociales {
  facebook: string;
  instagram: string;
  tiktok: string;
}

/** Datos comerciales generales. */
export const STORE_CONFIG = {
  nombre: 'Electro Bodegón',
  /** Frase de marca (meta description por defecto) */
  descripcion:
    'Electrodomésticos, TV y audio, línea blanca y electrodomésticos menores de las mejores marcas, al mejor precio. Dos sucursales y atención por WhatsApp.',
  /** ISO 3166-1 alfa-2 del país de las sucursales (prefijo telefónico 593) */
  pais: 'EC',
  /** Moneda de los precios publicados */
  moneda: 'USD',
  /** WhatsApp general (botón flotante, navbar) */
  whatsappPrincipal: '593986952147',
  /**
   * PENDIENTE: URLs reales de los perfiles de la tienda (entregadas por el cliente).
   * Mientras estén vacías no se muestran iconos ni se incluyen en los datos estructurados.
   */
  redes: {
    facebook: '',
    instagram: '',
    tiktok: ''
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
      horarioEstructurado: { dias: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], abre: '09:00', cierra: '19:00' },
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
      horarioEstructurado: { dias: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], abre: '09:00', cierra: '19:00' },
      icon: 'fas fa-store'
    }
  ] as SucursalConfig[]
};

/** URLs de redes realmente configuradas (para schema.org `sameAs`). */
export function redesConfiguradas(): string[] {
  return Object.values(STORE_CONFIG.redes).filter(url => /^https:\/\/\S+$/.test(url));
}

/** Teléfono en formato internacional E.164 a partir del WhatsApp (sin inventar datos nuevos). */
export function telefonoInternacional(whatsapp: string): string {
  return '+' + whatsapp;
}

/** Construye un enlace wa.me codificando correctamente el mensaje. */
export function whatsappLink(numero: string, mensaje?: string): string {
  const base = 'https://wa.me/' + numero;
  return mensaje ? base + '?text=' + encodeURIComponent(mensaje) : base;
}
