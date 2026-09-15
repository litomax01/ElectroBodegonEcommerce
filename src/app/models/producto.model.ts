export interface Producto {
  id: number;
  nombre: string;
  marca: string;
  categoria: 'TV y Audio' | 'Línea Blanca' | 'Electrodomésticos Menores' | 'Hogar';
  precio_original: number;
  precio_oferta: number;
  imagen_url: string;
  etiqueta: string;
  destacado?: boolean;
  descripcion?: string;
}
