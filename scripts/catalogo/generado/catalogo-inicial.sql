-- =====================================================================
-- Carga ÚNICA del catálogo inicial (generado desde public/assets/data/productos.json)
-- NO editar a mano: regenerar con scripts/catalogo/generar-sql-catalogo.mjs
-- Contenido: 4 categorías, 10 marcas, 55 productos, 55 imágenes.
-- Un solo bloque DO = una sola transacción: TODO o NADA. Sin UPDATE ni DELETE.
-- No toca esquema, RLS, Auth ni Storage.
-- =====================================================================
do $catalogo$
declare
  n_cat int; n_mar int; n_pro int; n_img int;
begin
  -- 1. Estado esperado: las cuatro tablas vacías
  select count(*) into n_cat from public.categories;
  select count(*) into n_mar from public.brands;
  select count(*) into n_pro from public.products;
  select count(*) into n_img from public.product_images;
  if n_cat <> 0 or n_mar <> 0 or n_pro <> 0 or n_img <> 0 then
    raise exception 'Estado inesperado del remoto (categories=%, brands=%, products=%, product_images=%): se esperaba todo vacío. No se escribió nada.',
      n_cat, n_mar, n_pro, n_img;
  end if;

  -- 2. Categorías
  insert into public.categories (name, slug) values
    ('TV y Audio', 'tv-y-audio'),
    ('Línea Blanca', 'linea-blanca'),
    ('Hogar', 'hogar'),
    ('Electrodomésticos Menores', 'electrodomesticos-menores');

  -- 3. Marcas
  insert into public.brands (name, slug) values
    ('Samsung', 'samsung'),
    ('LG', 'lg'),
    ('Mabe', 'mabe'),
    ('Indurama', 'indurama'),
    ('Oster', 'oster'),
    ('TCL', 'tcl'),
    ('Electrolux', 'electrolux'),
    ('Bosch', 'bosch'),
    ('Haceb', 'haceb'),
    ('Whirlpool', 'whirlpool');

  -- 4. Productos (marca y categoría se resuelven por nombre exacto)
  insert into public.products
    (legacy_id, slug, name, brand_id, category_id, short_description, description,
     price, compare_at_price, badge, is_featured, is_published)
  select v.legacy_id, v.slug, v.name, b.id, c.id, v.short_description, v.description,
         v.price, v.compare_at_price, v.badge, v.is_featured, v.is_published
  from (values
    (1, 'smart-tv-samsung-65-4k-qled-neo', 'Smart TV Samsung 65" 4K QLED Neo', 'Samsung', 'TV y Audio', 'Pantalla QLED 4K con Quantum HDR, 120Hz y Tizen OS', null, 980.00, 1200.00, '-18%', true, true),
    (2, 'refrigeradora-samsung-french-door-28-pies', 'Refrigeradora Samsung French Door 28 Pies', 'Samsung', 'Línea Blanca', 'Puerta francesa, dispensador de agua y hielo, Family Hub', null, 1099.00, 1350.00, '-19%', true, true),
    (3, 'lavadora-samsung-22-kg-wd22-ai-energy', 'Lavadora Samsung 22 kg WD22 AI Energy', 'Samsung', 'Línea Blanca', 'AI Energy Mode, EcoBubble, Motor Digital Inverter 22kg', null, 699.00, 850.00, '-18%', false, true),
    (4, 'smart-tv-samsung-43-crystal-uhd-4k', 'Smart TV Samsung 43" Crystal UHD 4K', 'Samsung', 'TV y Audio', 'Crystal Processor 4K, PurColor, SmartThings Hub integrado', null, 389.00, 499.00, '-22%', false, true),
    (5, 'aspiradora-samsung-jet-85-premium-inalambrica', 'Aspiradora Samsung Jet 85 Premium Inalámbrica', 'Samsung', 'Hogar', '210W, 60 min autonomía, filtro lavable HEPA, 0.8L', null, 329.00, 420.00, '-22%', false, true),
    (6, 'soundbar-samsung-hw-q600c-3-1-2-ch-atmos', 'Soundbar Samsung HW-Q600C 3.1.2 ch Atmos', 'Samsung', 'TV y Audio', 'Dolby Atmos, DTS:X, 340W de potencia total, subwoofer inalámbrico', null, 299.00, 380.00, '-21%', false, true),
    (7, 'smart-tv-lg-55-oled-evo-4k-c3', 'Smart TV LG 55" OLED evo 4K C3', 'LG', 'TV y Audio', 'OLED autoiluminado, α9 Gen6 AI Processor 4K, webOS 23', null, 890.00, 1100.00, '-19%', true, true),
    (8, 'refrigeradora-lg-16-pies-no-frost-door-cooling', 'Refrigeradora LG 16 Pies³ No Frost Door Cooling', 'LG', 'Línea Blanca', 'Door Cooling+, Multi Air Flow, Linear Cooling, 450L', null, 630.00, 780.00, '-19%', false, true),
    (9, 'lavadora-lg-20-kg-turbowash-360-con-ia', 'Lavadora LG 20 kg TurboWash 360 con IA', 'LG', 'Línea Blanca', 'TurboWash 360°, AI DD, Steam+ y WiFi ThinQ integrado', null, 649.00, 780.00, '-17%', false, true),
    (10, 'aire-acondicionado-lg-dual-cool-18000-btu', 'Aire Acondicionado LG DUAL Cool 18000 BTU', 'LG', 'Línea Blanca', 'Inverter, WiFi ThinQ, 18000 BTU, ahorro energético A++', null, 629.00, 780.00, '-19%', false, true),
    (11, 'sistema-de-sonido-lg-xboom-2-1-500w', 'Sistema de Sonido LG XBOOM 2.1 500W', 'LG', 'TV y Audio', '500W RMS, Bluetooth 5.0, USB, karaoke, luces LED party', null, 219.00, 280.00, '-22%', false, true),
    (12, 'purificador-de-agua-lg-wd516an-fria-caliente', 'Purificador de Agua LG WD516AN Fría/Caliente', 'LG', 'Hogar', 'Filtro multietapa, agua fría y caliente, diseño slim UVnano', null, 349.00, 420.00, '-17%', false, true),
    (13, 'refrigeradora-mabe-16-pies-no-frost-rme400fzpc', 'Refrigeradora Mabe 16 Pies³ No Frost RME400FZPC', 'Mabe', 'Línea Blanca', 'Sistema No Frost, dispensador de agua, iluminación LED, 454L', null, 620.00, 750.00, '-17%', true, true),
    (14, 'lavadora-mabe-18-kg-carga-superior-lma7814vbab0', 'Lavadora Mabe 18 kg Carga Superior LMA7814VBAB0', 'Mabe', 'Línea Blanca', '18 programas, motor de alto rendimiento, 18kg carga superior', null, 389.00, 480.00, '-19%', true, true),
    (15, 'lavadora-secadora-mabe-11kg-7kg-carga-frontal', 'Lavadora Secadora Mabe 11kg/7kg Carga Frontal', 'Mabe', 'Línea Blanca', 'Lavado y secado en un solo equipo, 11kg/7kg, motor Inverter', null, 729.00, 890.00, '-18%', false, true),
    (16, 'cocina-mabe-30-5-quemadores-acero-inoxidable', 'Cocina Mabe 30" 5 Quemadores Acero Inoxidable', 'Mabe', 'Línea Blanca', '5 quemadores, parrillas de hierro fundido, horno gran capacidad', null, 399.00, 490.00, '-19%', false, true),
    (17, 'microondas-mabe-1-1-cu-ft-1200w-con-grill', 'Microondas Mabe 1.1 Cu.ft 1200W con Grill', 'Mabe', 'Electrodomésticos Menores', '1200W, grill integrado, 10 niveles de potencia, timer digital', null, 115.00, 145.00, '-21%', false, true),
    (18, 'cocina-indurama-30-6-quemadores-ci-630-quarzo', 'Cocina Indurama 30" 6 Quemadores CI-630 Quarzo', 'Indurama', 'Línea Blanca', '6 quemadores a gas, horno con grill, encendido eléctrico automático', null, 449.00, 560.00, '-20%', false, true),
    (19, 'refrigeradora-indurama-14-pies-ri-395-croma', 'Refrigeradora Indurama 14 Pies³ RI-395 Croma', 'Indurama', 'Línea Blanca', 'Doble puerta, control electrónico de temperatura, 354L', null, 510.00, 620.00, '-18%', true, true),
    (20, 'congelador-horizontal-indurama-250l-ci-250', 'Congelador Horizontal Indurama 250L CI-250', 'Indurama', 'Línea Blanca', '250L, función ECO, temperatura hasta -22°C, canastilla interior', null, 389.00, 480.00, '-19%', false, true),
    (21, 'cocina-indurama-24-4-quemadores-ci-432', 'Cocina Indurama 24" 4 Quemadores CI-432', 'Indurama', 'Línea Blanca', '4 quemadores, encendido automático, horno grande con luz', null, 299.00, 380.00, '-21%', false, true),
    (22, 'microondas-oster-1-1-cu-ft-1000w-inox-ogzb1101', 'Microondas Oster 1.1 Cu.ft 1000W Inox OGZB1101', 'Oster', 'Electrodomésticos Menores', '1000W, 10 niveles de potencia, panel táctil, acero inoxidable', null, 89.00, 120.00, '-26%', false, true),
    (23, 'licuadora-oster-osterizer-pro-600w-6-velocidades', 'Licuadora Oster Osterizer Pro 600W 6 velocidades', 'Oster', 'Electrodomésticos Menores', '600W, 6 velocidades + pulso, jarra de vidrio 1.25L, base inox', null, 54.99, 75.00, '-27%', false, true),
    (24, 'cafetera-oster-prima-latte-iii-espresso-15-bar', 'Cafetera Oster Prima Latte III Espresso 15 Bar', 'Oster', 'Electrodomésticos Menores', '15 bares de presión, espumador de leche, cappuccino y latte perfecto', null, 139.00, 180.00, '-23%', false, true),
    (25, 'freidora-de-aire-oster-duraceramic-5-3-qt', 'Freidora de Aire Oster DuraCeramic 5.3 Qt', 'Oster', 'Electrodomésticos Menores', '5.3 QT, recubrimiento DuraCeramic, 1700W, 8 programas preset', null, 84.99, 110.00, '-23%', true, true),
    (26, 'plancha-a-vapor-oster-2200w-suela-titanio', 'Plancha a Vapor Oster 2200W Suela Titanio', 'Oster', 'Electrodomésticos Menores', 'Suela de titanio, 2200W, vapor vertical, antiadherente premium', null, 39.99, 55.00, '-27%', false, true),
    (27, 'procesador-de-alimentos-oster-10-tazas-600w', 'Procesador de Alimentos Oster 10 Tazas 600W', 'Oster', 'Electrodomésticos Menores', '10 tazas, 600W, cuchilla inox, disco rallador y rebanador incluidos', null, 72.00, 95.00, '-24%', false, true),
    (28, 'tostadora-oster-4-ranuras-1500w-digital', 'Tostadora Oster 4 Ranuras 1500W Digital', 'Oster', 'Electrodomésticos Menores', '4 ranuras extraanchas, 7 niveles de tostado, descongelar y recalentar', null, 47.99, 65.00, '-26%', false, true),
    (29, 'smart-tv-tcl-65-4k-qled-google-tv-c635', 'Smart TV TCL 65" 4K QLED Google TV C635', 'TCL', 'TV y Audio', 'QLED 4K, Google TV, Dolby Vision IQ, HDR10+, 144Hz Gaming', null, 679.00, 850.00, '-20%', true, true),
    (30, 'smart-tv-tcl-50-4k-uhd-google-tv-s546', 'Smart TV TCL 50" 4K UHD Google TV S546', 'TCL', 'TV y Audio', 'Google TV integrado, Dolby Vision, HDR10+, Chromecast built-in', null, 419.00, 520.00, '-19%', false, true),
    (31, 'televisor-tcl-32-hd-android-tv-32a522', 'Televisor TCL 32" HD Android TV 32A522', 'TCL', 'TV y Audio', 'Android 11, Chromecast integrado, Dolby Audio, WiFi dual band', null, 169.00, 210.00, '-19%', false, true),
    (32, 'barra-de-sonido-tcl-s522w-dolby-atmos-2-1', 'Barra de Sonido TCL S522W Dolby Atmos 2.1', 'TCL', 'TV y Audio', 'Dolby Atmos, subwoofer inalámbrico 200W, HDMI ARC, Bluetooth', null, 169.00, 220.00, '-23%', false, true),
    (33, 'refrigeradora-electrolux-efficient-14-pies-frostfree', 'Refrigeradora Electrolux Efficient 14 Pies³ FrostFree', 'Electrolux', 'Línea Blanca', 'FrostFree, Efficient LED, ColorTouch Panel, 397L', null, 589.00, 720.00, '-18%', true, true),
    (34, 'lavadora-electrolux-16-kg-ewf1604bes-carga-frontal', 'Lavadora Electrolux 16 kg EWF1604BES Carga Frontal', 'Electrolux', 'Línea Blanca', 'EcoInverter, UltraCare, vapor y WiFi integrado, 16kg', null, 559.00, 680.00, '-18%', false, true),
    (35, 'lavavajillas-electrolux-14-servicios-eea17200l', 'Lavavajillas Electrolux 14 servicios EEA17200L', 'Electrolux', 'Hogar', '14 servicios, 9 programas, SecureLock, ahorro energético A++', null, 499.00, 620.00, '-20%', false, true),
    (36, 'cocina-electrolux-5-quemadores-ek5gh-inox', 'Cocina Electrolux 5 Quemadores EK5GH Inox', 'Electrolux', 'Línea Blanca', '5 quemadores, 1 wok, encendido automático, horno multifunción', null, 445.00, 550.00, '-19%', false, true),
    (37, 'microondas-electrolux-1-5-cu-ft-1200w-emo25', 'Microondas Electrolux 1.5 Cu.ft 1200W EMO25', 'Electrolux', 'Electrodomésticos Menores', '1200W, 10 niveles, 1.5 cu.ft, sensor de cocción automático', null, 139.00, 175.00, '-21%', false, true),
    (38, 'secadora-electrolux-16-kg-eed47b5sb', 'Secadora Electrolux 16 kg EED47B5SB', 'Electrolux', 'Línea Blanca', 'EcoInverter, sensor de humedad, 16kg, WiFi EWX integrado', null, 469.00, 580.00, '-19%', false, true),
    (39, 'lavavajillas-bosch-serie-6-sms6zci42e-14-servicios', 'Lavavajillas Bosch Serie 6 SMS6ZCI42E 14 servicios', 'Bosch', 'Hogar', 'EfficientDry, VarioSpeedPlus, WiFi Home Connect, A+++ energía', null, 599.00, 750.00, '-20%', false, true),
    (40, 'refrigeradora-bosch-508l-multi-door-inox-kfn96apea', 'Refrigeradora Bosch 508L Multi Door Inox KFN96APEA', 'Bosch', 'Línea Blanca', 'NoFrost, FreshSense, VitaFresh XXL, pantalla touch, 508L', null, 1449.00, 1800.00, '-19%', true, true),
    (41, 'lavadora-bosch-10-kg-serie-6-wau28ui0es-i-dos', 'Lavadora Bosch 10 kg Serie 6 WAU28UI0ES i-DOS', 'Bosch', 'Línea Blanca', 'i-DOS dosificación automática, SpeedPerfect, EcoSilence Drive, 10kg', null, 749.00, 920.00, '-19%', false, true),
    (42, 'horno-electrico-bosch-hba534bs0-pirolitico-71l', 'Horno Eléctrico Bosch HBA534BS0 Pirolítico 71L', 'Bosch', 'Línea Blanca', 'Pirolítico, 71L, HydroClean Pro, 4D HotAir, panel táctil', null, 629.00, 780.00, '-19%', false, true),
    (43, 'cocina-haceb-titanio-4-quemadores-chc-400', 'Cocina Haceb Titanio 4 Quemadores CHC-400', 'Haceb', 'Línea Blanca', '4 quemadores, encendido automático, horno con grill, timer', null, 249.00, 310.00, '-20%', false, true),
    (44, 'ventilador-de-torre-haceb-40-3-velocidades-vpt-40', 'Ventilador de Torre Haceb 40" 3 velocidades VPT-40', 'Haceb', 'Electrodomésticos Menores', 'Control remoto, temporizador 7.5h, oscilación 70°, modo sleep', null, 74.00, 95.00, '-22%', false, true),
    (45, 'robot-de-cocina-haceb-multifuncion-rcm-1000', 'Robot de Cocina Haceb Multifunción RCM-1000', 'Haceb', 'Electrodomésticos Menores', 'Licua, pica, ralla y amasa, 1000W, 8 accesorios incluidos', null, 119.00, 150.00, '-21%', false, true),
    (46, 'refrigeradora-haceb-14-pies-evolution-no-frost', 'Refrigeradora Haceb 14 Pies³ Evolution No Frost', 'Haceb', 'Línea Blanca', 'No Frost, doble puerta, panel digital exterior, 395L', null, 469.00, 580.00, '-19%', false, true),
    (47, 'lavadora-whirlpool-18-kg-carga-superior-wtrl1800', 'Lavadora Whirlpool 18 kg Carga Superior WTRL1800', 'Whirlpool', 'Línea Blanca', '18kg, agitador de alta eficiencia, 12 ciclos, 6th Sense Technology', null, 419.00, 520.00, '-19%', false, true),
    (48, 'refrigeradora-whirlpool-18-pies-wrf540cwhz-french-door', 'Refrigeradora Whirlpool 18 Pies³ WRF540CWHZ French Door', 'Whirlpool', 'Línea Blanca', 'French Door, dispensador agua/hielo, FreshFlow, 510L', null, 889.00, 1100.00, '-19%', false, true),
    (49, 'microondas-whirlpool-1-7-cu-ft-over-the-range-wmh31017hz', 'Microondas Whirlpool 1.7 Cu.ft Over-the-Range WMH31017HZ', 'Whirlpool', 'Electrodomésticos Menores', '1.7 cu.ft, 1000W, sensor cooking, extractor de olores integrado', null, 219.00, 280.00, '-22%', false, true),
    (50, 'cama-electrica-ajustable-hogar-premium-motorizada-haceb', 'Cama Eléctrica Ajustable Hogar Premium Motorizada', 'Haceb', 'Hogar', 'Motor silencioso, posiciones cabeza y pies, mando inalámbrico USB', null, 519.00, 650.00, '-20%', false, true),
    (51, 'extractor-de-jugos-oster-jussimple-wide-700w', 'Extractor de Jugos Oster JusSimple Wide 700W', 'Oster', 'Electrodomésticos Menores', '700W, 3 velocidades, tubo de alimentación extra ancho, jarra 1L', null, 64.99, 89.00, '-27%', false, true),
    (52, 'horno-de-conveccion-electrolux-ebo30s5msp-30l', 'Horno de Convección Electrolux EBO30S5MSP 30L', 'Electrolux', 'Electrodomésticos Menores', '30L, convección, 8 funciones, temperatura 100-230°C, timer 60 min', null, 149.00, 190.00, '-22%', false, true),
    (53, 'smart-tv-whirlpool-55-4k-uhd-wtv55smart', 'Smart TV Whirlpool 55" 4K UHD WTV55SMART', 'Whirlpool', 'TV y Audio', '4K UHD, Android TV, Dolby Audio, HDR10, WiFi dual band', null, 459.00, 580.00, '-21%', false, true),
    (54, 'batidora-de-pie-bosch-mum5-1000w-creationline', 'Batidora de Pie Bosch MUM5 1000W CreationLine', 'Bosch', 'Electrodomésticos Menores', '1000W, bowl 3.9L, 4 accesorios inox, 7 velocidades + Turbo', null, 259.00, 320.00, '-19%', false, true),
    (55, 'indurama-cocina-empotrable-4-quemadores-a-gas', 'Indurama Cocina Empotrable 4 Quemadores a Gas', 'Indurama', 'Línea Blanca', 'Empotrable, 4 quemadores, parrillas selladas inox, vidrio templado', null, 229.00, 290.00, '-21%', false, true)
  ) as v (legacy_id, slug, name, brand, category, short_description, description,
          price, compare_at_price, badge, is_featured, is_published)
  join public.brands b     on b.name = v.brand
  join public.categories c on c.name = v.category;

  -- 5. Imágenes (solo external_url; storage_path queda NULL; position = orden del JSON)
  insert into public.product_images (product_id, position, external_url)
  select p.id, v.position, v.external_url
  from (values
    (1, 0, 'https://images.unsplash.com/photo-1593359677879-a4bb92f829e1?w=600&q=80'),
    (2, 0, 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=600&q=80'),
    (3, 0, 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=600&q=80'),
    (4, 0, 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80'),
    (5, 0, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80'),
    (6, 0, 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&q=80'),
    (7, 0, 'https://images.unsplash.com/photo-1571415060716-baff5f717c37?w=600&q=80'),
    (8, 0, 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=600&q=80'),
    (9, 0, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80'),
    (10, 0, 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80'),
    (11, 0, 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&q=80'),
    (12, 0, 'https://images.unsplash.com/photo-1559825481-12a05cc00344?w=600&q=80'),
    (13, 0, 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=600&q=80'),
    (14, 0, 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=600&q=80'),
    (15, 0, 'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=600&q=80'),
    (16, 0, 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=600&q=80'),
    (17, 0, 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80'),
    (18, 0, 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80'),
    (19, 0, 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=600&q=80'),
    (20, 0, 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=600&q=80'),
    (21, 0, 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=600&q=80'),
    (22, 0, 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80'),
    (23, 0, 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=600&q=80'),
    (24, 0, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80'),
    (25, 0, 'https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?w=600&q=80'),
    (26, 0, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80'),
    (27, 0, 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=600&q=80'),
    (28, 0, 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?w=600&q=80'),
    (29, 0, 'https://images.unsplash.com/photo-1593359677879-a4bb92f829e1?w=600&q=80'),
    (30, 0, 'https://images.unsplash.com/photo-1567690187548-f07b1d7bf5a9?w=600&q=80'),
    (31, 0, 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80'),
    (32, 0, 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&q=80'),
    (33, 0, 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=600&q=80'),
    (34, 0, 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=600&q=80'),
    (35, 0, 'https://images.unsplash.com/photo-1558618047-3c0d3b5e0a9c?w=600&q=80'),
    (36, 0, 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=600&q=80'),
    (37, 0, 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80'),
    (38, 0, 'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=600&q=80'),
    (39, 0, 'https://images.unsplash.com/photo-1558618047-3c0d3b5e0a9c?w=600&q=80'),
    (40, 0, 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=600&q=80'),
    (41, 0, 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=600&q=80'),
    (42, 0, 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80'),
    (43, 0, 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=600&q=80'),
    (44, 0, 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&q=80'),
    (45, 0, 'https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?w=600&q=80'),
    (46, 0, 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=600&q=80'),
    (47, 0, 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=600&q=80'),
    (48, 0, 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=600&q=80'),
    (49, 0, 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80'),
    (50, 0, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80'),
    (51, 0, 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80'),
    (52, 0, 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80'),
    (53, 0, 'https://images.unsplash.com/photo-1593359677879-a4bb92f829e1?w=600&q=80'),
    (54, 0, 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=600&q=80'),
    (55, 0, 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80')
  ) as v (legacy_id, position, external_url)
  join public.products p on p.legacy_id = v.legacy_id;

  -- 6. Verificación final: si algo no cuadra, se deshace TODO
  select count(*) into n_cat from public.categories;
  select count(*) into n_mar from public.brands;
  select count(*) into n_pro from public.products;
  select count(*) into n_img from public.product_images;
  if n_cat <> 4 or n_mar <> 10 or n_pro <> 55 or n_img <> 55 then
    raise exception 'Conteos finales inesperados (categories=%, brands=%, products=%, product_images=%). Se deshace todo.',
      n_cat, n_mar, n_pro, n_img;
  end if;
  if exists (select 1 from public.products where legacy_id not between 1 and 55 or not is_published) then
    raise exception 'Productos con legacy_id fuera de rango o sin publicar. Se deshace todo.';
  end if;
  if exists (select 1 from public.product_images where storage_path is not null or external_url is null) then
    raise exception 'Imágenes con storage_path o sin external_url. Se deshace todo.';
  end if;
  raise notice 'Catálogo cargado: % categorías, % marcas, % productos, % imágenes', n_cat, n_mar, n_pro, n_img;
end
$catalogo$;
