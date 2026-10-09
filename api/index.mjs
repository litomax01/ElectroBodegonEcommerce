/**
 * Función de Vercel: delega TODA petición dinámica en el servidor Angular SSR ya compilado
 * (src/server.ts → dist/ElectroBodegon/server/server.mjs). Los archivos estáticos con hash
 * los sirve directamente la CDN de Vercel desde dist/ElectroBodegon/browser.
 *
 * Solo se usa en Vercel. En cualquier otro host Node basta `node dist/ElectroBodegon/server/server.mjs`.
 */
import { reqHandler } from '../dist/ElectroBodegon/server/server.mjs';

export default reqHandler;
