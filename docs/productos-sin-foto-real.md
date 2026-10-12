# Productos que necesitan fotografía real

Las imágenes externas (Unsplash) de estos 5 productos devuelven **HTTP 404**: las URLs ya estaban
rotas en `productos.json` antes de migrar a Supabase. No es un fallo de Supabase, del repositorio,
del mapper, de Angular ni de RLS.

La tienda muestra el marcador local "Imagen no disponible" (`app-imagen-no-disponible`).
Las URLs actuales se **conservan en la base de datos como referencia** (`product_images.external_url`)
hasta que se suban fotografías reales desde /admin (Storage, `storage_path`).

| legacy_id | Producto | URL externa (404) |
|---|---|---|
| 1 | Smart TV Samsung 65" 4K QLED Neo | `https://images.unsplash.com/photo-1593359677879-a4bb92f829e1?w=600&q=80` |
| 29 | Smart TV TCL 65" 4K QLED Google TV C635 | `https://images.unsplash.com/photo-1593359677879-a4bb92f829e1?w=600&q=80` |
| 53 | Smart TV Whirlpool 55" 4K UHD WTV55SMART | `https://images.unsplash.com/photo-1593359677879-a4bb92f829e1?w=600&q=80` |
| 35 | Lavavajillas Electrolux 14 servicios EEA17200L | `https://images.unsplash.com/photo-1558618047-3c0d3b5e0a9c?w=600&q=80` |
| 39 | Lavavajillas Bosch Serie 6 SMS6ZCI42E 14 servicios | `https://images.unsplash.com/photo-1558618047-3c0d3b5e0a9c?w=600&q=80` |

Nota: el resto de productos usa imágenes genéricas de Unsplash que sí cargan, pero no son fotografías
reales del producto (varias se repiten entre productos).


## Fotos de stock corregidas (2026-10-11)

Se revisaron las 55 fotos una por una (hoja de contacto con producto + foto). Las que mostraban otra
cosa se reemplazan al mostrarse por una foto de stock gratuita (Unsplash, no Unsplash+) del mismo tipo
de producto. La base de datos NO se modificó; la corrección vive en
`src/app/core/models/fotos-no-corresponden.ts` (reversible vaciando sus listas).

| Producto (legacy_id) | Foto ahora |
|---|---|
| Smart TV / televisores (1, 4, 7, 29, 31, 53) | televisor en una sala (los de enlace roto 1, 29, 53 ya tienen foto) |
| Refrigeradoras French/Multi door (2, 40, 48) | refrigeradora de acero de dos puertas |
| Refrigeradoras (8, 13, 19, 33, 46) | refrigeradora de acero |
| Congelador horizontal (20) | refrigeradora (no hay foto libre de congelador horizontal) |
| Microondas (17, 22, 37, 49) | microondas |
| Licuadora y procesador (23, 27) | licuadora |
| Robot de cocina (45) | jarra de licuadora con vegetales |
| Batidora de pie (54) | batidora de pie |
| Freidora de aire (25) | freidora de aire |
| Cafetera (24) | máquina de espresso |
| Extractor de jugos (51) | extractores de jugo sobre mesón |
| Tostadora (28) | tostadora |
| Aire acondicionado (10) | split de pared |
| Lavavajillas (35, 39) | lavavajillas abierto con platos (los de enlace roto ya tienen foto) |
| Horno eléctrico (42) / convección (52) | horno / horno tostador |
| Cocinas a gas (16, 18, 21, 36, 43, 55) | cocina a gas |
| Lavadoras (3, 9, 14, 34, 41, 47) | lavadora |

Siguen siendo fotos de stock del TIPO de producto, no del modelo exacto. Para fotos reales,
subirlas desde /admin (siempre tienen prioridad). Las fotos de Unsplash+ (de pago) no se usan.
