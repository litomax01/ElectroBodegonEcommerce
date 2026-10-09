import { Producto } from '../models/producto.model';
import { STORE_CONFIG, SucursalConfig, redesConfiguradas, telefonoInternacional } from '../config/store.config';
import { JsonLd } from './seo.service';

/**
 * Datos estructurados (schema.org). Solo se publican datos que existen en la configuración
 * o en la base de datos: sin direcciones, teléfonos, redes ni disponibilidad inventados.
 */

type Absoluta = (urlORuta: string) => string;

function sucursalLd(s: SucursalConfig, abs: Absoluta): JsonLd {
  return {
    '@type': 'ElectronicsStore',
    '@id': abs(`/sucursales#${s.id}`),
    name: s.nombre,
    url: abs('/sucursales'),
    telephone: telefonoInternacional(s.whatsapp),
    image: abs('/logo.png'),
    address: {
      '@type': 'PostalAddress',
      streetAddress: s.direccion,
      addressCountry: STORE_CONFIG.pais
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: s.horarioEstructurado.dias,
        opens: s.horarioEstructurado.abre,
        closes: s.horarioEstructurado.cierra
      }
    ],
    parentOrganization: { '@id': abs('/#organizacion') }
  };
}

/** Organización + una tienda (LocalBusiness) por sucursal. */
export function organizacionLd(abs: Absoluta): JsonLd[] {
  const redes = redesConfiguradas();
  const organizacion: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': abs('/#organizacion'),
    name: STORE_CONFIG.nombre,
    url: abs('/'),
    logo: abs('/logo.png'),
    description: STORE_CONFIG.descripcion,
    contactPoint: STORE_CONFIG.sucursales.map(s => ({
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: telefonoInternacional(s.whatsapp),
      areaServed: STORE_CONFIG.pais,
      availableLanguage: 'es',
      name: s.nombre
    })),
    ...(redes.length ? { sameAs: redes } : {})
  };
  return [organizacion, ...STORE_CONFIG.sucursales.map(s => ({ '@context': 'https://schema.org', ...sucursalLd(s, abs) }))];
}

export function sitioWebLd(abs: Absoluta): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': abs('/#sitio'),
    name: STORE_CONFIG.nombre,
    url: abs('/'),
    inLanguage: 'es-EC',
    publisher: { '@id': abs('/#organizacion') },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: abs('/catalogo') + '?q={search_term_string}' },
      'query-input': 'required name=search_term_string'
    }
  };
}

export function migasLd(items: { nombre: string; ruta: string }[], abs: Absoluta): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.nombre,
      item: abs(it.ruta)
    }))
  };
}

const DISPONIBILIDAD_SCHEMA: Record<string, string> = {
  disponible: 'https://schema.org/InStock',
  pocas_unidades: 'https://schema.org/LimitedAvailability',
  bajo_pedido: 'https://schema.org/BackOrder',
  agotado: 'https://schema.org/OutOfStock'
};

/** Product + Offer. `availability` solo si el producto la tiene registrada (no se inventa). */
export function productoLd(p: Producto, rutaProducto: string, abs: Absoluta): JsonLd {
  const imagenes = p.imagenes.map(i => abs(i.url)).filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': abs(rutaProducto) + '#producto',
    name: p.nombre,
    url: abs(rutaProducto),
    ...(imagenes.length ? { image: imagenes } : {}),
    ...(p.descripcion || p.descripcionCorta ? { description: p.descripcion ?? p.descripcionCorta } : {}),
    ...(p.sku ? { sku: p.sku } : {}),
    ...(p.modelo ? { mpn: p.modelo, model: p.modelo } : {}),
    brand: { '@type': 'Brand', name: p.marca },
    category: p.categoria,
    offers: {
      '@type': 'Offer',
      url: abs(rutaProducto),
      price: p.precio.toFixed(2),
      priceCurrency: STORE_CONFIG.moneda,
      ...(p.disponibilidad ? { availability: DISPONIBILIDAD_SCHEMA[p.disponibilidad] } : {}),
      seller: { '@id': abs('/#organizacion') }
    }
  };
}
