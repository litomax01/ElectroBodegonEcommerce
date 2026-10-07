import { Producto } from '../models/producto.model';
import { formatoPrecio } from '../models/producto.helpers';
import { SucursalConfig, whatsappLink } from '../config/store.config';

/**
 * Mensaje de consulta de un producto. Solo incluye datos existentes.
 * `urlProducto` se construye en tiempo de ejecución con el origen actual,
 * así funciona igual con el dominio definitivo.
 */
export function mensajeConsultaProducto(p: Producto, asesorNombre: string, urlProducto?: string): string {
  const lineas = [`Hola ${asesorNombre}, estoy interesado en:`, '', p.nombre, `Marca: ${p.marca}`];
  if (p.modelo) lineas.push(`Modelo: ${p.modelo}`);
  if (p.precio > 0) lineas.push(`Precio: ${formatoPrecio(p.precio)}`);
  lineas.push('', '¿Me pueden confirmar disponibilidad y formas de pago?');
  if (urlProducto) lineas.push('', 'Producto:', urlProducto);
  return lineas.join('\n');
}

export function whatsappProductoLink(s: SucursalConfig, p: Producto, urlProducto?: string): string {
  return whatsappLink(s.whatsapp, mensajeConsultaProducto(p, s.asesorNombre, urlProducto));
}
