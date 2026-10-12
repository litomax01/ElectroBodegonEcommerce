# Guía del administrador — Electro Bodegón

Esta guía es para el dueño de la tienda. No necesitas saber programar: todo lo que cambia a
diario (productos, precios, fotos) se hace desde el panel de administración.

## 1. Entrar al panel

1. Abre tu sitio web y añade `/admin` al final de la dirección (por ejemplo `tusitio.com/admin`).
2. Ingresa con tu correo y contraseña.
3. Al terminar, usa **Cerrar sesión**, sobre todo si usas un computador compartido.

> Tu contraseña es personal. No la compartas por WhatsApp ni la guardes en archivos de texto.
> Si la olvidas o quieres dar acceso a otra persona, avisa a quien administra el sitio.

## 2. Qué puedes hacer tú mismo

| Quiero…                                   | Dónde                                                    |
| ----------------------------------------- | -------------------------------------------------------- |
| Ver cuántos productos hay y cuáles ocultos | **Resumen** (pantalla inicial)                           |
| Buscar un producto                         | **Productos** → buscador o filtros de categoría/marca    |
| Cambiar un precio                          | **Productos** → editar → *Precio actual* → Guardar       |
| Poner un producto en oferta                | Editar → *Precio original* (el anterior) y *Precio actual* (el nuevo). El descuento se calcula solo |
| Ocultar un producto (sin borrarlo)         | En la lista, botón del ojo, o *Visibilidad* al editar    |
| Marcar un producto como destacado          | En la lista, botón de la estrella                        |
| Agregar un producto nuevo                  | **Productos** → **Nuevo producto**                       |
| Cambiar fotos                              | Editar → sección **Imágenes**                            |
| Crear una marca o categoría nueva          | Dentro del formulario de producto, campo *Nueva marca/categoría* |
| Eliminar un producto                       | Editar → **Eliminar producto** (no se puede deshacer)    |
| Cambiar teléfonos, WhatsApp o asesor       | **Tienda y sucursales** → sucursal → *Asesor de WhatsApp* |
| Cambiar horarios o dirección de una sucursal | **Tienda y sucursales** → sucursal → días y horas      |
| Agregar Facebook / Instagram / TikTok      | **Tienda y sucursales** → *Datos generales y redes*      |
| Poner mi propio banner en la portada       | **Portada y banners** → *Nuevo banner*                   |
| Quitar o mostrar diapositivas automáticas  | **Portada y banners** → *Diapositivas automáticas*       |

## 3. Paso a paso: crear un producto

1. **Productos → Nuevo producto**.
2. Completa lo obligatorio (marcado con *): **Nombre**, **Marca**, **Categoría** y **Precio actual**.
   La dirección web (*slug*) se propone sola a partir del nombre.
3. Opcional pero recomendable: descripción corta, modelo, garantía, disponibilidad y especificaciones
   (nombre + valor, por ejemplo *Capacidad* → *300 L*).
4. Guarda. Después de guardar podrás subir las **imágenes**.
5. Cuando esté listo, deja activada la opción de **publicado**; si no, queda oculto para el público.

**Consejo:** si no conoces un dato (medidas, garantía, stock), déjalo vacío. Lo que no se llena, no se
muestra en la tienda; es mejor eso que poner un dato inventado.

## 4. Fotos

- Formatos: JPG, PNG, WebP o AVIF. Máximo 5 MB por foto.
- Las fotos se optimizan automáticamente al subirlas, así la tienda carga rápido.
- La **primera** foto es la principal (la que se ve en el catálogo). Con la estrella se elige otra
  como principal y con las flechas se cambia el orden.
- Mejor resultado: fondo claro, el producto centrado y bien iluminado, foto cuadrada o casi cuadrada.

## 5. Cuándo se ven los cambios

Los cambios se guardan al instante en la base de datos. En la tienda pública pueden tardar
**unos minutos** en aparecer (la página guarda una copia temporal para ir más rápido). Si después de
unos minutos no ves el cambio, recarga con `Ctrl + F5` (en el celular, cierra y abre la pestaña).

## 6. Tienda y sucursales (WhatsApp, horarios, redes)

En **Tienda y sucursales** editas lo que ven tus clientes al contactarte:

- **Datos generales:** nombre de la tienda, WhatsApp principal (botón flotante y menú) y enlaces de
  Facebook, Instagram y TikTok. Una red vacía no se muestra en la web. Los enlaces deben empezar con `https://`.
- **Cada sucursal:** nombre, dirección, teléfono visible, días y horario de atención. El texto del
  horario ("Lun – Sáb: 9:00 AM – 7:00 PM") se genera solo a partir de los días y horas que elijas;
  verás una vista previa antes de guardar.
- **Asesor de WhatsApp:** nombre, cargo, número y **foto** (aparece en la portada). Los botones "Consultar por WhatsApp" de esa sucursal
  abren ese número. Puedes escribir el número como lo marcas ("0986 952 147"); el sistema lo convierte
  al formato internacional.
- **Visible en la tienda:** desmarca esta opción para ocultar temporalmente una sucursal.

Cada sucursal y los datos generales se guardan por separado con su propio botón **Guardar**.

## 7. Portada y banners (el carrusel grande del inicio)

En **Portada y banners** controlas el carrusel que ven tus clientes al entrar. Se compone de dos partes:

### 1. Mis banners (los creas tú)
Son tus propias diapositivas: una promoción, una campaña, un anuncio. Salen **al inicio** del carrusel,
en el orden de la lista (usa las flechas para subir o bajar). Para cada banner eliges:

| Campo               | Qué cambia en la tienda                                                                 |
| ------------------- | --------------------------------------------------------------------------------------- |
| Cómo se ve          | *Texto y foto*: título, texto y botón a la izquierda y foto a la derecha. *Solo imagen*: una imagen ancha ya diseñada (por ejemplo en Canva) |
| Título              | El texto grande del banner (máx. 80 letras)                                             |
| Etiqueta pequeña    | La frase chiquita encima del título, por ejemplo "Solo esta semana"                    |
| Texto               | El párrafo corto debajo del título                                                      |
| Color               | Fondo rojo o blanco del banner                                                          |
| Foto / imagen       | La imagen. Se optimiza sola al subirla. *Solo imagen*: ideal 1600 × 700 px y lo importante al centro (en celular se recortan los bordes) |
| Descripción imagen  | No se ve: ayuda a lectores de pantalla y a Google                                       |
| El botón lleva a…   | Catálogo, ofertas, sucursales, una categoría, una marca u otro enlace `https://`        |
| Texto del botón     | Lo que dice el botón. Vacío = sin botón                                                 |
| Mostrar en la tienda| Desmárcalo para dejar el banner guardado sin que se vea (útil para fechas especiales)  |

Cada banner tiene botones para **subir/bajar**, **ocultar**, **editar** y **eliminar**. Si solo quieres
dejar de mostrarlo por un tiempo, es mejor *ocultarlo* que eliminarlo.

### 2. Diapositivas que ya tenía tu tienda
Son las diapositivas de siempre y **ya vienen listas**: no tienes que hacer nada. En el panel ves, una por una y
en el mismo orden del carrusel (con su número de diapositiva), **qué foto y qué texto tiene cada una ahora**.
Para cada diapositiva puedes:

- **Mostrarla u ocultarla** con la casilla "Se muestra".
- **Cambiar una foto:** cada foto aparece con su miniatura y dice "Ahora muestra: foto del producto X".
  Pulsa **Poner otra foto en su lugar**, elige tu imagen y listo: reemplaza solo esa posición.
  Con **Volver a la original** regresa la foto del producto.
- **Cambiar los textos:** aparecen escritos tal como se ven en la tienda; los editas y pulsas
  **Guardar textos**. Si te arrepientes de un campo, **Poner el original**.
- **Volver todo al original** (textos y fotos de esa diapositiva) con un solo botón.

| Diapositiva | Qué contiene | Qué puedes cambiar |
| --- | --- | --- |
| **Banner de ofertas** (fondo rojo) | 4 fotos de productos al centro y el mayor descuento a la derecha | Las 4 fotos, el título, la frase de apoyo, el texto antes del porcentaje, la etiqueta y el botón. El porcentaje se calcula solo con tus precios |
| **Mensaje de bienvenida** (fondo blanco) | "Todo para tu hogar, al mejor precio", lista con ✓ y una foto | La foto, la etiqueta, las dos líneas del título, el texto, la lista y el botón |
| **Productos en oferta** | Una diapositiva por producto (los 3 de mayor ahorro) con precio y ahorro | La foto de cada una y el texto del botón. Los productos los elige el sistema según el descuento: para que salga uno, ponle precio original mayor al actual |
| **Asesores por sucursal** | "¿Necesitas ayuda para elegir?" con foto y WhatsApp de cada asesor | Etiqueta, título, texto y botón. La foto, nombre y número de cada asesor se cambian en *Tienda y sucursales* |

También eliges la **velocidad** con que cambia el carrusel. Si ocultas todas y no tienes banners propios,
el sistema muestra el mensaje de bienvenida para que el carrusel nunca quede vacío.

**Consejo:** después de cambiar un banner, abre tu tienda en el celular y revisa que se vea bien.

### Lo que NO se cambia desde el panel

Pide estos cambios a quien administra la página:

- El diseño de las diapositivas (colores, distribución) y las frases fijas que no aparecen en los formularios.
- Logo y colores.
- Agregar o eliminar una sucursal, o crear otros usuarios administradores.

## 8. Buenas prácticas

- **Ocultar en vez de eliminar** si un producto se agotó temporalmente: así conservas sus fotos y datos.
- Revisa el precio dos veces antes de guardar; es lo que ven tus clientes y lo que llega por WhatsApp.
- Evita subir 30 productos de golpe sin revisarlos: crea uno, míralo en la tienda y luego sigue.
- Si algo falla (aparece un mensaje rojo), no repitas la acción muchas veces: anota el mensaje o toma
  una captura y envíala a quien administra el sitio.

## 9. Problemas frecuentes

| Problema                                  | Qué hacer                                                         |
| ----------------------------------------- | ----------------------------------------------------------------- |
| "Acceso denegado" al ingresar              | Tu correo no tiene permisos de administrador; avisa al responsable |
| No me deja subir una foto                  | Revisa que sea JPG/PNG/WebP/AVIF y pese menos de 5 MB             |
| Guardé pero no lo veo en la tienda         | Espera unos minutos y recarga con `Ctrl + F5`                     |
| El producto no aparece en el catálogo      | Verifica que esté **publicado** y tenga marca y categoría         |
| Olvidé mi contraseña                       | Pide a quien administra el sitio que la restablezca               |
