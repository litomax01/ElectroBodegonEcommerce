import { Producto } from '../models/producto.model';
import { porcentajeDescuento, tieneDescuento } from '../models/producto.helpers';

/**
 * Reglas del carrusel de portada compartidas por la tienda (HeroComponent) y por el panel
 * (/admin/portada), para que el panel muestre exactamente lo que la tienda va a mostrar.
 */

/** Textos ORIGINALES de las diapositivas automáticas (lo que se ve si el administrador no cambia nada). */
export const TEXTOS_ORIGINALES = {
  ofertas: {
    titulo: 'Ofertas\npara tu\nhogar',
    sub: 'Ingresa y elige lo que necesitas para tu hogar',
    pre: 'Encuentra hasta un',
    pill: 'En productos seleccionados',
    boton: 'Ver ofertas'
  },
  bienvenida: {
    chip: (sucursales: number) => `${sucursales} sucursales · Atención por WhatsApp`,
    titulo: 'Todo para tu hogar,',
    acento: 'al mejor precio.',
    texto:
      'Las mejores marcas en línea blanca, TV y electrodomésticos menores. Elige en el catálogo y cierra tu compra por WhatsApp.',
    lista: ['Marcas oficiales', 'Asesor por WhatsApp', 'Entrega coordinada'],
    boton: 'Ver catálogo'
  },
  promos: { boton: 'Ver este producto' },
  asesoria: {
    chip: 'Atención por WhatsApp',
    titulo: '¿Necesitas ayuda\npara elegir?',
    texto: 'Un asesor de la sucursal más cercana te ayuda a escoger el electrodoméstico ideal para tu hogar.',
    boton: 'Ver mapas y horarios'
  }
} as const;

/** Cantidad máxima de fotos reemplazables por diapositiva. */
export const MAX_PROMOS = 3;
export const MAX_VITRINA = 4;

/** Ofertas: los productos con mayor ahorro real y foto. */
export function seleccionarPromos(productos: Producto[], tieneFoto: (p: Producto) => boolean): Producto[] {
  return productos
    .filter(p => tieneDescuento(p) && tieneFoto(p))
    .sort((a, b) => porcentajeDescuento(b) - porcentajeDescuento(a))
    .slice(0, MAX_PROMOS);
}

/** Vitrina del banner de ofertas: hasta 4 productos de categorías distintas (los de mayor descuento con foto). */
export function seleccionarVitrina(productos: Producto[], tieneFoto: (p: Producto) => boolean): Producto[] {
  const vistas = new Set<string>();
  const resultado: Producto[] = [];
  const orden = productos.filter(tieneFoto).sort((a, b) => porcentajeDescuento(b) - porcentajeDescuento(a));
  for (const p of orden) {
    const c = p.categoria ?? '';
    if (vistas.has(c)) continue;
    vistas.add(c);
    resultado.push(p);
    if (resultado.length === MAX_VITRINA) break;
  }
  return resultado;
}

/** Producto cuya foto ilustra la bienvenida (línea blanca si hay; si no, el primero con foto). */
export function seleccionarPortada(productos: Producto[], tieneFoto: (p: Producto) => boolean): Producto | null {
  const conFoto = productos.filter(tieneFoto);
  return conFoto.find(p => /blanca/i.test(p.categoria ?? '')) ?? conFoto[0] ?? null;
}

export function mayorDescuento(productos: Producto[]): number {
  return productos.filter(tieneDescuento).reduce((m, p) => Math.max(m, porcentajeDescuento(p)), 0);
}

/** Clave de una foto reemplazable: "ofertas:2" = segunda foto de la vitrina. */
export function claveFoto(slide: 'ofertas' | 'bienvenida' | 'promos', posicion: number): string {
  return `${slide}:${posicion}`;
}
