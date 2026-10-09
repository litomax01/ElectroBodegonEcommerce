/**
 * Optimiza una foto antes de subirla a Storage: reduce el lado mayor a 1600 px y la recodifica
 * en WebP. Una foto de móvil de 4-5 MB queda en ~100-300 kB, lo que acelera la tienda.
 *
 * Es conservador: si no puede decodificar/recodificar la imagen, o el resultado no es más
 * pequeño que el original, se sube el archivo original sin cambios.
 */
const LADO_MAXIMO = 1600;
const UMBRAL_BYTES = 350 * 1024;
const CALIDAD = 0.85;

export async function optimizarImagen(original: File): Promise<File> {
  // Solo JPG/PNG/WebP (AVIF ya es eficiente y no todos los navegadores lo recodifican)
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(original.type)) return original;
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return original;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(original);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
    // Ya es pequeña en bytes y en píxeles: no se toca
    if (escala === 1 && original.size <= UMBRAL_BYTES) return original;

    const ancho = Math.max(1, Math.round(bitmap.width * escala));
    const alto = Math.max(1, Math.round(bitmap.height * escala));
    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext('2d');
    if (!ctx) return original;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, ancho, alto);

    const blob = await new Promise<Blob | null>(res => lienzo.toBlob(res, 'image/webp', CALIDAD));
    if (!blob || blob.type !== 'image/webp' || blob.size >= original.size) return original;

    const nombre = original.name.replace(/\.[^.]+$/, '') || 'imagen';
    return new File([blob], `${nombre}.webp`, { type: 'image/webp', lastModified: Date.now() });
  } catch {
    return original;
  } finally {
    bitmap?.close();
  }
}
