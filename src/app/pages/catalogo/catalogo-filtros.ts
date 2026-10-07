import { ParamMap } from '@angular/router';
import { Producto } from '../../core/models/producto.model';
import { porcentajeDescuento } from '../../core/models/producto.helpers';

/**
 * Estado completo del catálogo y función pura de filtrado.
 * Separado del componente para poder sincronizarlo con la URL o con
 * consultas de Supabase más adelante sin tocar la plantilla.
 *
 * Query params soportados: ?marca=  ?categoria=  ?q=  ?orden=
 */

export const ORDENES = ['default', 'precio_asc', 'precio_desc', 'descuento', 'nombre'] as const;
export type Orden = (typeof ORDENES)[number];

export interface EstadoCatalogo {
  marcas: string[];
  categorias: string[];
  busqueda: string;
  orden: Orden;
}

export function esOrden(v: string | null | undefined): v is Orden {
  return !!v && (ORDENES as readonly string[]).includes(v);
}

/** Lee los query params. `busqueda`/`orden` quedan undefined si no vienen en la URL. */
export function leerParams(params: ParamMap): Partial<EstadoCatalogo> & Pick<EstadoCatalogo, 'marcas' | 'categorias'> {
  const q = params.get('q');
  const orden = params.get('orden');
  return {
    marcas: params.getAll('marca').filter(Boolean),
    categorias: params.getAll('categoria').filter(Boolean),
    busqueda: q !== null ? q.slice(0, 100) : undefined,
    orden: esOrden(orden) ? orden : undefined
  };
}

export function filtrarProductos(productos: Producto[], estado: EstadoCatalogo): Producto[] {
  let result = [...productos];

  if (estado.categorias.length > 0) {
    result = result.filter(p => estado.categorias.includes(p.categoria));
  }
  if (estado.marcas.length > 0) {
    result = result.filter(p => estado.marcas.includes(p.marca));
  }

  const query = estado.busqueda.trim().toLowerCase();
  if (query) {
    result = result.filter(p =>
      [p.nombre, p.marca, p.categoria, p.modelo, p.descripcionCorta]
        .some(campo => campo?.toLowerCase().includes(query))
    );
  }

  switch (estado.orden) {
    case 'precio_asc':
      result.sort((a, b) => a.precio - b.precio);
      break;
    case 'precio_desc':
      result.sort((a, b) => b.precio - a.precio);
      break;
    case 'descuento':
      result.sort((a, b) => porcentajeDescuento(b) - porcentajeDescuento(a));
      break;
    case 'nombre':
      result.sort((a, b) => a.nombre.localeCompare(b.nombre));
      break;
  }

  return result;
}
