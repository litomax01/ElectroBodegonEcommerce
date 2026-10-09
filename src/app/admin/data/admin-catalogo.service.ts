import { Injectable, inject } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { slugify } from '../../core/models/producto.helpers';
import { optimizarImagen } from './optimizar-imagen';
import {
  FiltrosProductos,
  ImagenAdmin,
  OpcionCatalogo,
  PaginaProductos,
  ProductoAdminRow,
  ProductoPayload,
  ResumenCatalogo,
  TAMANO_MAX_IMAGEN,
  TIPOS_IMAGEN_PERMITIDOS
} from './admin.models';

const BUCKET = 'catalog-media';

const SELECT_PRODUCTO = `
  *,
  brand:brands ( name ),
  category:categories ( name ),
  images:product_images ( id, product_id, storage_path, external_url, alt_text, position )
`;

/** Error con mensaje ya traducido para mostrarlo al administrador. */
export class ErrorAdmin extends Error {
  constructor(
    mensaje: string,
    readonly codigo?: string,
    readonly campo?: 'slug' | 'sku' | 'nombre'
  ) {
    super(mensaje);
  }
}

/**
 * Operaciones del panel sobre Supabase. Todas usan la sesión del administrador
 * (clave publicable + JWT del usuario): RLS decide si se permite cada escritura.
 */
@Injectable({ providedIn: 'root' })
export class AdminCatalogoService {
  private readonly supabase = inject(SupabaseService);

  private get db(): SupabaseClient {
    return this.supabase.client;
  }

  // ------------------------------------------------------------------
  // Resumen y listas auxiliares
  // ------------------------------------------------------------------

  async resumen(): Promise<ResumenCatalogo> {
    const contar = async (tabla: string, filtro?: (q: any) => any): Promise<number> => {
      let q: any = this.db.from(tabla).select('id', { count: 'exact', head: true });
      if (filtro) q = filtro(q);
      const { count, error } = await q;
      if (error) throw this.traducir(error);
      return count ?? 0;
    };
    const [total, publicados, destacados, categorias, marcas] = await Promise.all([
      contar('products'),
      contar('products', q => q.eq('is_published', true)),
      contar('products', q => q.eq('is_featured', true)),
      contar('categories'),
      contar('brands')
    ]);
    return { total, publicados, ocultos: total - publicados, destacados, categorias, marcas };
  }

  listarCategorias(): Promise<OpcionCatalogo[]> {
    return this.listarOpciones('categories');
  }

  listarMarcas(): Promise<OpcionCatalogo[]> {
    return this.listarOpciones('brands');
  }

  private async listarOpciones(tabla: 'categories' | 'brands'): Promise<OpcionCatalogo[]> {
    const { data, error } = await this.db.from(tabla).select('id, name, slug, is_active').order('name');
    if (error) throw this.traducir(error);
    return (data ?? []) as OpcionCatalogo[];
  }

  crearCategoria(nombre: string): Promise<OpcionCatalogo> {
    return this.crearOpcion('categories', nombre);
  }

  crearMarca(nombre: string): Promise<OpcionCatalogo> {
    return this.crearOpcion('brands', nombre);
  }

  /** Crea una categoría/marca nueva. No edita ni borra existentes (afectaría a productos). */
  private async crearOpcion(tabla: 'categories' | 'brands', nombre: string): Promise<OpcionCatalogo> {
    const limpio = nombre.trim().replace(/\s+/g, ' ');
    if (!limpio) throw new ErrorAdmin('Escribe un nombre.');
    if (limpio.length > 80) throw new ErrorAdmin('El nombre no puede superar 80 caracteres.');
    const slug = slugify(limpio);
    if (!slug) throw new ErrorAdmin('El nombre debe contener letras o números.');
    const { data, error } = await this.db
      .from(tabla)
      .insert({ name: limpio, slug })
      .select('id, name, slug, is_active')
      .single();
    if (error) {
      if (error.code === '23505') {
        throw new ErrorAdmin(`Ya existe ${tabla === 'brands' ? 'una marca' : 'una categoría'} con ese nombre.`, error.code);
      }
      throw this.traducir(error);
    }
    return data as OpcionCatalogo;
  }

  // ------------------------------------------------------------------
  // Productos
  // ------------------------------------------------------------------

  async listarProductos(f: FiltrosProductos): Promise<PaginaProductos> {
    let q = this.db.from('products').select(SELECT_PRODUCTO, { count: 'exact' });

    const texto = f.q.trim().replace(/[,()%*\\]/g, ' ').replace(/\s+/g, ' ').trim();
    if (texto) q = q.or(`name.ilike.%${texto}%,slug.ilike.%${texto}%,sku.ilike.%${texto}%,model.ilike.%${texto}%`);
    if (f.categoriaId) q = q.eq('category_id', f.categoriaId);
    if (f.marcaId) q = q.eq('brand_id', f.marcaId);
    if (f.estado === 'publicados') q = q.eq('is_published', true);
    if (f.estado === 'ocultos') q = q.eq('is_published', false);
    if (f.destacado) q = q.eq('is_featured', true);

    const desde = (f.pagina - 1) * f.porPagina;
    const { data, error, count } = await q
      .order('name', { ascending: true })
      .order('id', { ascending: true })
      .range(desde, desde + f.porPagina - 1);
    if (error) throw this.traducir(error);
    return { filas: (data ?? []) as unknown as ProductoAdminRow[], total: count ?? 0 };
  }

  async obtenerProducto(id: string): Promise<ProductoAdminRow | null> {
    const { data, error } = await this.db.from('products').select(SELECT_PRODUCTO).eq('id', id).maybeSingle();
    if (error) throw this.traducir(error);
    return (data as unknown as ProductoAdminRow) ?? null;
  }

  /** El uuid se genera aquí para poder subir imágenes a products/{id}/ justo después. */
  async crearProducto(payload: ProductoPayload): Promise<string> {
    const id = crypto.randomUUID();
    const { error } = await this.db.from('products').insert({ id, ...payload });
    if (error) throw this.traducir(error);
    return id;
  }

  async actualizarProducto(id: string, payload: ProductoPayload): Promise<void> {
    const { data, error } = await this.db.from('products').update(payload).eq('id', id).select('id');
    if (error) throw this.traducir(error);
    // RLS bloqueó (o no existe): update sin filas afectadas
    if (!data || data.length === 0) throw new ErrorAdmin('No se pudo guardar: sin permiso o el producto ya no existe.');
  }

  async cambiarPublicado(id: string, publicado: boolean): Promise<void> {
    await this.actualizarCampo(id, { is_published: publicado });
  }

  async cambiarDestacado(id: string, destacado: boolean): Promise<void> {
    await this.actualizarCampo(id, { is_featured: destacado });
  }

  private async actualizarCampo(id: string, cambios: Partial<Pick<ProductoPayload, 'is_published' | 'is_featured'>>) {
    const { data, error } = await this.db.from('products').update(cambios).eq('id', id).select('id');
    if (error) throw this.traducir(error);
    if (!data || data.length === 0) throw new ErrorAdmin('No se pudo actualizar: sin permiso o el producto ya no existe.');
  }

  /** ¿El slug está libre? (excluye el propio producto al editar). */
  async slugDisponible(slug: string, excluirId?: string): Promise<boolean> {
    let q = this.db.from('products').select('id', { count: 'exact', head: true }).eq('slug', slug);
    if (excluirId) q = q.neq('id', excluirId);
    const { count, error } = await q;
    if (error) throw this.traducir(error);
    return (count ?? 0) === 0;
  }

  /**
   * Elimina un producto. Solo se invoca tras una confirmación explícita y únicamente con
   * productos ocultos. Primero se borran sus archivos de Storage (las filas de
   * product_images se eliminan en cascada).
   */
  async eliminarProducto(id: string): Promise<void> {
    const producto = await this.obtenerProducto(id);
    if (!producto) return;
    if (producto.is_published) throw new ErrorAdmin('Oculta el producto antes de eliminarlo.');
    const rutas = (producto.images ?? []).map(i => i.storage_path).filter((r): r is string => !!r);
    if (rutas.length) {
      const { error: errStorage } = await this.db.storage.from(BUCKET).remove(rutas);
      if (errStorage) throw new ErrorAdmin('No se pudieron borrar las imágenes del producto. No se eliminó nada.');
    }
    const { data, error } = await this.db.from('products').delete().eq('id', id).select('id');
    if (error) throw this.traducir(error);
    if (!data || data.length === 0) throw new ErrorAdmin('No se pudo eliminar: sin permiso o el producto ya no existe.');
  }

  // ------------------------------------------------------------------
  // Imágenes (Storage: catalog-media/products/{productId}/{uuid.ext})
  // ------------------------------------------------------------------

  urlPublica(path: string): string {
    return this.db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  urlImagen(img: Pick<ImagenAdmin, 'storage_path' | 'external_url'>): string | null {
    return img.storage_path ? this.urlPublica(img.storage_path) : img.external_url;
  }

  validarArchivo(archivo: File): string | null {
    if (!TIPOS_IMAGEN_PERMITIDOS.includes(archivo.type)) return `"${archivo.name}": formato no permitido (usa JPG, PNG, WebP o AVIF).`;
    if (archivo.size > TAMANO_MAX_IMAGEN) return `"${archivo.name}": supera los 5 MB.`;
    if (archivo.size === 0) return `"${archivo.name}": el archivo está vacío.`;
    return null;
  }

  private extension(archivo: File): string {
    return { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' }[archivo.type] ?? 'jpg';
  }

  private async subirArchivo(productId: string, original: File): Promise<string> {
    const problema = this.validarArchivo(original);
    if (problema) throw new ErrorAdmin(problema);
    // Se reduce y recodifica en WebP cuando conviene (fotos de móvil de varios MB)
    const archivo = await optimizarImagen(original);
    const ruta = `products/${productId}/${crypto.randomUUID()}.${this.extension(archivo)}`;
    const { error } = await this.db.storage
      .from(BUCKET)
      .upload(ruta, archivo, { contentType: archivo.type, cacheControl: '31536000', upsert: false });
    if (error) throw this.traducirStorage(error.message);
    return ruta;
  }

  private async borrarArchivo(ruta: string | null): Promise<void> {
    if (!ruta) return;
    await this.db.storage.from(BUCKET).remove([ruta]); // best effort: un archivo huérfano no afecta a la tienda
  }

  /** Sube un archivo y lo añade al final de la galería (la primera imagen queda como principal). */
  async agregarImagen(productId: string, archivo: File, siguientePosicion: number): Promise<ImagenAdmin> {
    const ruta = await this.subirArchivo(productId, archivo);
    const { data, error } = await this.db
      .from('product_images')
      .insert({ product_id: productId, storage_path: ruta, position: siguientePosicion })
      .select('id, product_id, storage_path, external_url, alt_text, position')
      .single();
    if (error) {
      await this.borrarArchivo(ruta); // no dejar el archivo huérfano
      throw this.traducir(error);
    }
    return data as ImagenAdmin;
  }

  /** Sustituye el archivo de una imagen conservando su posición. */
  async reemplazarImagen(img: ImagenAdmin, archivo: File): Promise<ImagenAdmin> {
    const ruta = await this.subirArchivo(img.product_id, archivo);
    const { data, error } = await this.db
      .from('product_images')
      .update({ storage_path: ruta, external_url: null })
      .eq('id', img.id)
      .select('id, product_id, storage_path, external_url, alt_text, position');
    if (error || !data?.length) {
      await this.borrarArchivo(ruta);
      throw error ? this.traducir(error) : new ErrorAdmin('No se pudo reemplazar la imagen.');
    }
    await this.borrarArchivo(img.storage_path);
    return data[0] as ImagenAdmin;
  }

  async eliminarImagen(img: ImagenAdmin): Promise<void> {
    const { data, error } = await this.db.from('product_images').delete().eq('id', img.id).select('id');
    if (error) throw this.traducir(error);
    if (!data?.length) throw new ErrorAdmin('No se pudo eliminar la imagen: sin permiso o ya no existe.');
    await this.borrarArchivo(img.storage_path);
  }

  /**
   * Fija el orden de la galería (índice 0 = principal). unique(product_id, position) no se
   * puede violar en pasos intermedios, así que se hace en dos pasadas.
   */
  async ordenarImagenes(productId: string, idsEnOrden: string[]): Promise<void> {
    const OFFSET = 1000;
    for (let i = 0; i < idsEnOrden.length; i++) {
      await this.fijarPosicion(productId, idsEnOrden[i], OFFSET + i);
    }
    for (let i = 0; i < idsEnOrden.length; i++) {
      await this.fijarPosicion(productId, idsEnOrden[i], i);
    }
  }

  private async fijarPosicion(productId: string, imagenId: string, position: number): Promise<void> {
    const { data, error } = await this.db
      .from('product_images')
      .update({ position })
      .eq('id', imagenId)
      .eq('product_id', productId)
      .select('id');
    if (error) throw this.traducir(error);
    if (!data?.length) throw new ErrorAdmin('No se pudo reordenar las imágenes.');
  }

  // ------------------------------------------------------------------
  // Traducción de errores
  // ------------------------------------------------------------------

  private traducir(error: { code?: string; message: string; details?: string }): ErrorAdmin {
    const texto = `${error.message} ${error.details ?? ''}`;
    switch (error.code) {
      case '23505':
        if (texto.includes('products_slug_key')) return new ErrorAdmin('Ya existe un producto con ese slug.', error.code, 'slug');
        if (texto.includes('products_sku_key')) return new ErrorAdmin('Ya existe un producto con ese SKU.', error.code, 'sku');
        if (texto.includes('product_images_position')) return new ErrorAdmin('Conflicto al ordenar las imágenes. Recarga e inténtalo de nuevo.', error.code);
        return new ErrorAdmin('Ya existe un registro con esos datos.', error.code);
      case '23514':
        if (texto.includes('compare_at_price')) return new ErrorAdmin('El precio original debe ser mayor que el precio actual.', error.code);
        return new ErrorAdmin('Algún dato no cumple las reglas de validación. Revisa el formulario.', error.code);
      case '23503':
        return new ErrorAdmin('El registro está relacionado con otros datos y no se puede completar la operación.', error.code);
      case '42501':
        return new ErrorAdmin('No tienes permiso para realizar esta acción.', error.code);
      default:
        if (/jwt|token|expired/i.test(error.message)) return new ErrorAdmin('Tu sesión expiró. Vuelve a iniciar sesión.', error.code);
        if (/fetch|network/i.test(error.message)) return new ErrorAdmin('Sin conexión con el servidor. Inténtalo de nuevo.', error.code);
        return new ErrorAdmin('Ocurrió un error inesperado. Inténtalo de nuevo.', error.code);
    }
  }

  private traducirStorage(mensaje: string): ErrorAdmin {
    if (/row-level security|unauthorized|not authorized|403/i.test(mensaje)) {
      return new ErrorAdmin('No tienes permiso para subir imágenes.');
    }
    if (/mime|type/i.test(mensaje)) return new ErrorAdmin('Formato de imagen no permitido.');
    if (/size|too large|payload/i.test(mensaje)) return new ErrorAdmin('La imagen supera el tamaño máximo (5 MB).');
    return new ErrorAdmin('No se pudo subir la imagen. Inténtalo de nuevo.');
  }
}
