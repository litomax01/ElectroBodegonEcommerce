/**
 * Fotos de stock (Unsplash) del catálogo inicial: corrección por producto.
 *
 * El catálogo inicial usa fotografías genéricas y varias NO corresponden al producto
 * (audífonos en un microondas, helado en una licuadora, etc.). Aquí se:
 *   1) detectan esas fotos, y
 *   2) se reemplazan por una foto de stock del mismo tipo de producto (según el nombre).
 *      Si no hay reemplazo, no se muestra foto ("Imagen no disponible").
 *
 * - Solo afecta a URLs externas; las fotos subidas desde /admin (Storage) nunca se tocan.
 * - Son fotos de stock del TIPO de producto, no del modelo exacto: lo ideal es subir la
 *   foto real de cada modelo desde /admin.
 * - Para revertir: vaciar FOTOS_NO_CORRESPONDEN y FOTOS_SOLO_PARA.
 * - Detalle: docs/productos-sin-foto-real.md
 */
const FOTOS_NO_CORRESPONDEN = [
  '1611532736597-de2d4265fba3', // tableta sobre un escritorio
  '1558618666-fcd25c85cd64',    // persona soldando
  '1571415060716-baff5f717c37', // televisor de tubo antiguo
  '1585771724684-38269d6639fd', // audífonos
  '1559825481-12a05cc00344',    // fondo marino
  '1574269909862-7e1d70bb8078', // horno tostador (no es una cocina a gas)
  '1570197788417-0e82375c9371', // helado
  '1587049352851-8d4e89133924', // miel
  '1558961363-fa8fdf82db35',    // galletas
  '1593359677879-a4bb92f829e1',   // enlace roto (404): televisor
  '1558618047-3c0d3b5e0a9c',    // enlace roto (404): lavavajillas
  '1556909114-f6e7ad7d3136',    // pareja cocinando (no muestra ningún electrodoméstico)
  '1584568694244-14fbdf83bd30', // refrigeradora de supermercado (puertas de vidrio)
  '1571175443880-49e1d25b2bc5', // refrigeradora retro turquesa
  '1585325701956-60dd9c8553bc', // comida frita (no es una freidora ni un robot)
  '1495474472287-4d71bcdd2085', // tazas de café (no es una cafetera)
  '1726614846573-c1ac2e6161d1', // letrero de calle (no es un aire acondicionado)
  '1779591211702-d01dc6d13f9a', // extractor borroso
  '1564940735784-b15466e8dc09'  // batidora verde con botellas
] as const;

/** Fotos válidas solo para cierto tipo de producto (se reutilizan entre varios). */
const FOTOS_SOLO_PARA: ReadonlyArray<{ id: string; nombre: RegExp }> = [];

/** Foto de reemplazo según el nombre del producto (el orden importa: primero lo más específico). */
const REEMPLAZOS: ReadonlyArray<{ nombre: RegExp; id: string }> = [
  { nombre: /microondas/i,                         id: '1585659722983-3a675dabf23d' }, // microondas
  { nombre: /freidora/i,                           id: '1695089028114-ce28248f0ab9' }, // freidora de aire
  { nombre: /robot de cocina/i,                    id: '1585237672814-8f85a8118bf6' }, // procesador / robot de cocina
  { nombre: /licuadora|procesador/i,               id: '1577576174518-1de5f96eaff0' }, // licuadora / procesador
  { nombre: /batidora/i,                           id: '1693875161668-5c4ae0f2bf20' }, // batidora de pie
  { nombre: /tostadora/i,                          id: '1686644823126-7ed947386b77' }, // tostadora
  { nombre: /extractor de jugos/i,                 id: '1685131702426-a691d87d10cc' }, // extractor de jugos
  { nombre: /cafetera/i,                           id: '1620807773206-49c1f2957417' }, // cafetera espresso
  { nombre: /ventilador/i,                         id: '1568392816241-44d223d4d490' }, // ventilador
  { nombre: /aire acondicionado/i,                 id: '1762341123870-d706f257a12e' }, // aire acondicionado (split)
  { nombre: /aspiradora/i,                         id: '1765970101654-337b573142fb' }, // aspiradora
  { nombre: /plancha/i,                            id: '1540544093-b0880061e1a5' }, // plancha a vapor
  { nombre: /purificador|dispensador/i,            id: '1780590107737-9381035b8265' }, // dispensador de agua
  { nombre: /lavavajillas/i,                       id: '1581622558663-b2e33377dfb2' }, // lavavajillas
  { nombre: /convecci|tostador/i,                  id: '1574269909862-7e1d70bb8078' }, // horno de convección (sobre mesón)
  { nombre: /horno/i,                              id: '1565357253897-79d691886a73' }, // horno empotrado
  { nombre: /cocina/i,                             id: '1623114112815-74a4b9fe505d' }, // cocina a gas
  { nombre: /congelador/i,                         id: '1721613877687-c9099b698faa' }, // sin foto libre de congelador horizontal: refrigeradora
  { nombre: /french door|multi door/i,             id: '1588854337115-1c67d9247e4d' }, // refrigeradora de puertas
  { nombre: /refrigeradora/i,                      id: '1721613877687-c9099b698faa' }, // refrigeradora
  { nombre: /smart tv|televisor/i,                 id: '1595935736128-db1f0a261263' }, // televisor
  { nombre: /lavadora/i,                           id: '1626806787461-102c1bfaaea1' }  // lavadora
];

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?w=600&q=80`;

/** Foto externa que no corresponde al producto */
function noCorresponde(url: string, nombre: string): boolean {
  if (FOTOS_NO_CORRESPONDEN.some(id => url.includes(id))) return true;
  const regla = FOTOS_SOLO_PARA.find(r => url.includes(r.id));
  return !!regla && !regla.nombre.test(nombre);
}

/**
 * URL a mostrar para la foto de un producto:
 * - la misma si es de Storage (subida por el dueño) o si corresponde;
 * - una foto de stock del mismo tipo si no corresponde y hay reemplazo;
 * - `null` si no corresponde y no hay reemplazo.
 */
export function resolverFoto(url: string | null | undefined, nombreProducto: string): string | null {
  if (!url) return null;
  if (url.includes('/storage/')) return url;
  if (!noCorresponde(url, nombreProducto)) return url;
  const r = REEMPLAZOS.find(x => x.nombre.test(nombreProducto));
  return r ? unsplash(r.id) : null;
}
