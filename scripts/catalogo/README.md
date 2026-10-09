# Migración del catálogo (productos.json → Supabase)

Herramientas de la carga inicial del catálogo y de su verificación.

> **La carga inicial YA se ejecutó** en el proyecto remoto `electro-bodegon`
> (4 categorías, 10 marcas, 55 productos, 55 imágenes). **No vuelvas a aplicar el SQL**
> sin comprobar antes el estado de la base: el script aborta si las tablas no están vacías,
> pero no lo uses para "reparar" datos. Los cambios posteriores se hacen desde el panel /admin.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `catalogo-comun.mjs` | Lee y valida `productos.json`, construye el plan y compara producto a producto. |
| `auditar-catalogo.mjs` | Auditoría offline del JSON (conteos, duplicados, advertencias). No usa red. |
| `generar-sql-catalogo.mjs` | Genera el SQL de carga a partir del JSON. |
| `generado/catalogo-inicial.sql` | SQL histórico de la carga inicial (un solo bloque `DO`, atómico, solo INSERT). No va en `supabase/migrations`. |
| `verificar-catalogo.mjs` | Compara JSON vs Supabase (solo lectura). |

## Verificar JSON vs Supabase

```bash
node scripts/catalogo/verificar-catalogo.mjs            # contra el proyecto de .env
node scripts/catalogo/verificar-catalogo.mjs --autotest # prueba la lógica sin red
```

Lee `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` del entorno o de `.env`. Resultado esperado:

```
Productos JSON: 55
Productos Supabase: 55
Coincidencias completas: 55
Diferencias: 0
```

El código de salida es 0 solo si todo coincide. Si el catálogo se edita desde /admin,
el verificador mostrará diferencias legítimas: úsalo sobre todo justo después de una carga.

## Otras utilidades

```bash
node scripts/catalogo/auditar-catalogo.mjs        # valida productos.json
node scripts/catalogo/generar-sql-catalogo.mjs    # regenera generado/catalogo-inicial.sql
```

## Claves

**No se necesita ninguna clave secreta** (`service_role` / `sb_secret_`). Los scripts de este
directorio solo usan la clave **publicable** (lectura, sujeta a RLS). La carga inicial se hizo
con la CLI de Supabase ya enlazada (`supabase db query --linked --file ...`), sin credenciales
adicionales.
