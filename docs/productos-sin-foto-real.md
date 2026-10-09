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
