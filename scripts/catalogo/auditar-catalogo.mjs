#!/usr/bin/env node
/**
 * Auditoría OFFLINE de public/assets/data/productos.json (no usa red ni escribe nada).
 *
 *   node scripts/catalogo/auditar-catalogo.mjs
 *
 * Valida el catálogo con las mismas reglas que el generador SQL y muestra qué se
 * cargaría: conteos, categorías, marcas, advertencias y errores. Sale con código 1
 * si hay errores.
 */
import { construirPlan, leerProductosJson } from './catalogo-comun.mjs';

const plan = construirPlan(leerProductosJson());

console.log(`Productos: ${plan.productos.length} | Categorías: ${plan.categorias.length} | Marcas: ${plan.marcas.length} | Imágenes: ${plan.imagenes.length}`);
console.log(`Categorías: ${plan.categorias.map(c => `${c.name} (${c.slug})`).join(', ')}`);
console.log(`Marcas: ${plan.marcas.map(m => `${m.name} (${m.slug})`).join(', ')}`);
console.log(`Destacados: ${plan.productos.filter(p => p.is_featured).length}`);
for (const a of plan.advertencias) console.log(`ADVERTENCIA: ${a}`);
for (const e of plan.errores) console.log(`ERROR: ${e}`);
console.log(plan.errores.length ? `\n${plan.errores.length} error(es).` : '\nSin errores.');
process.exit(plan.errores.length ? 1 : 0);
