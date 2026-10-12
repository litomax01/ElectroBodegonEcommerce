import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminPortadaService } from '../../data/admin-portada.service';
import { AdminCatalogoService, ErrorAdmin } from '../../data/admin-catalogo.service';
import { AdminUiService } from '../../core/admin-ui.service';
import { OpcionCatalogo } from '../../data/admin.models';
import {
  AjustesHero,
  BannerAdmin,
  BannerPayload,
  ClaveSlide,
  ClaveSlideConFotos,
  DESTINOS_BASE,
  FotoPropia,
  LayoutBanner,
  SlideAdmin,
  VELOCIDADES
} from '../../data/portada.models';
import { ProductRepository } from '../../../data/repositories/product.repository';
import { Producto } from '../../../core/models/producto.model';
import { STORE_CONFIG } from '../../../core/config/store.config';
import {
  MAX_PROMOS,
  MAX_VITRINA,
  TEXTOS_ORIGINALES,
  claveFoto,
  mayorDescuento,
  seleccionarPortada,
  seleccionarPromos,
  seleccionarVitrina
} from '../../../core/hero/hero-seleccion';

const noVacio: ValidatorFn = c => (typeof c.value === 'string' && c.value.length > 0 && c.value.trim() === '' ? { vacio: true } : null);
const https: ValidatorFn = c => {
  const v = typeof c.value === 'string' ? c.value.trim() : '';
  return v === '' || /^https:\/\/[^\s]+$/.test(v) ? null : { url: true };
};

type CampoTexto = 'eyebrow' | 'title' | 'subtitle' | 'body' | 'button_label';

interface CampoSlide {
  campo: CampoTexto;
  etiqueta: string;
  /** En qué parte de la diapositiva sale, dicho en palabras simples */
  donde: string;
  max: number;
  area?: boolean;
}

interface DefinicionSlide {
  clave: ClaveSlide;
  visible: 'hero_show_offers' | 'hero_show_welcome' | 'hero_show_promos' | 'hero_show_advisors';
  icono: string;
  titulo: string;
  descripcion: string;
  campos: CampoSlide[];
}

const SLIDES: DefinicionSlide[] = [
  {
    clave: 'ofertas',
    visible: 'hero_show_offers',
    icono: 'fa-tags',
    titulo: 'Banner de ofertas',
    descripcion: 'Fondo rojo con las fotos de varios productos al centro y, a la derecha, el mayor descuento de tu catálogo.',
    campos: [
      { campo: 'title', etiqueta: 'Título grande', donde: 'a la izquierda, en letras blancas grandes', max: 100, area: true },
      { campo: 'subtitle', etiqueta: 'Frase debajo del título', donde: 'a la izquierda, debajo del título', max: 120 },
      { campo: 'eyebrow', etiqueta: 'Frase antes del porcentaje', donde: 'a la derecha, justo encima del número grande', max: 80 },
      { campo: 'body', etiqueta: 'Etiqueta debajo del porcentaje', donde: 'a la derecha, en la cápsula blanca', max: 120 },
      { campo: 'button_label', etiqueta: 'Texto del botón', donde: 'a la derecha, el botón blanco', max: 30 }
    ]
  },
  {
    clave: 'bienvenida',
    visible: 'hero_show_welcome',
    icono: 'fa-store',
    titulo: 'Mensaje de bienvenida',
    descripcion: 'Fondo blanco con el mensaje principal de la tienda a la izquierda y una foto a la derecha.',
    campos: [
      { campo: 'eyebrow', etiqueta: 'Etiqueta superior', donde: 'arriba del título, en la cápsula pequeña', max: 80 },
      { campo: 'title', etiqueta: 'Título (primera línea)', donde: 'título grande, en negro', max: 100 },
      { campo: 'subtitle', etiqueta: 'Título (segunda línea)', donde: 'título grande, en rojo', max: 120 },
      { campo: 'body', etiqueta: 'Texto', donde: 'párrafo debajo del título', max: 260, area: true },
      { campo: 'button_label', etiqueta: 'Texto del primer botón', donde: 'el botón rojo (lleva al catálogo)', max: 30 }
    ]
  },
  {
    clave: 'promos',
    visible: 'hero_show_promos',
    icono: 'fa-percent',
    titulo: 'Productos en oferta',
    descripcion: 'Una diapositiva por cada uno de los productos con mayor ahorro: nombre, precio, cuánto ahorra y la foto a la derecha.',
    campos: [
      { campo: 'button_label', etiqueta: 'Texto del botón', donde: 'en todas las diapositivas de producto', max: 30 }
    ]
  },
  {
    clave: 'asesoria',
    visible: 'hero_show_advisors',
    icono: 'fa-headset',
    titulo: 'Asesores por sucursal',
    descripcion: 'Pregunta "¿Necesitas ayuda para elegir?" con la foto y el botón de WhatsApp de cada asesor.',
    campos: [
      { campo: 'eyebrow', etiqueta: 'Etiqueta superior', donde: 'arriba del título, en la cápsula pequeña', max: 80 },
      { campo: 'title', etiqueta: 'Título', donde: 'título grande a la izquierda', max: 100, area: true },
      { campo: 'body', etiqueta: 'Texto', donde: 'párrafo debajo del título', max: 260, area: true },
      { campo: 'button_label', etiqueta: 'Texto del botón', donde: 'el botón (lleva a Sucursales)', max: 30 }
    ]
  }
];

/** Fila de "foto" que se muestra en el panel. */
interface FilaFoto {
  slide: ClaveSlideConFotos;
  slot: number;
  etiqueta: string;
  /** Qué foto se ve ahora, en palabras ("Foto del producto: Aire Acondicionado LG") */
  actual: string;
  url: string | null;
  propia: FotoPropia | null;
}

const normaliza = (t: string) => t.replace(/\r\n/g, '\n').trim();

@Component({
  selector: 'app-admin-portada',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <header class="mb-6">
      <h1 class="font-montserrat font-extrabold text-2xl text-[#111827]">Portada de la tienda</h1>
      <p class="text-sm text-gray-600 mt-1 max-w-3xl">
        Es el <strong>carrusel grande</strong> que ven tus clientes al entrar. Las diapositivas pasan solas, una tras otra,
        <strong>en el orden de esta página</strong>: primero <strong>tus banners</strong> (sección 1) y después las diapositivas que
        ya tenía tu tienda (sección 2). En cada una puedes ver qué contiene y cambiarlo.
      </p>
    </header>

    @if (cargando()) {
      <div class="space-y-4" aria-busy="true"><div class="h-56 rounded-2xl bg-gray-200 animate-pulse"></div><div class="h-72 rounded-2xl bg-gray-200 animate-pulse"></div></div>
    } @else if (errorCarga(); as e) {
      <div role="alert" class="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {{ e }} <button type="button" (click)="cargar()" class="ml-2 underline font-semibold">Reintentar</button>
      </div>
    } @else {

      <!-- ============ 1. Mis banners ============ -->
      <section class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6" aria-labelledby="p-banners">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 id="p-banners" class="font-montserrat font-bold text-lg text-[#111827]">1. Mis banners <span class="text-sm font-normal text-gray-500">(los creas tú)</span></h2>
            <p class="text-sm text-gray-600 mt-1 max-w-2xl">
              Una promoción, una campaña, un anuncio. Salen <strong>primero</strong> en el carrusel, en el orden de esta lista.
              Los ocultos no se muestran.
            </p>
          </div>
          @if (editando() === null) {
            <button type="button" (click)="nuevoBanner()" class="btn-guardar shrink-0"><i class="fas fa-plus"></i> Nuevo banner</button>
          }
        </div>

        @if (editando() !== null) {
          <form [formGroup]="form" (ngSubmit)="guardarBanner()" novalidate class="mt-5 rounded-xl border-2 border-[#E60000]/30 bg-red-50/30 p-4 sm:p-5">
            <h3 class="font-montserrat font-bold text-[#111827] mb-4">
              {{ editando() === 'nuevo' ? 'Nuevo banner' : 'Editar banner' }}
            </h3>

            <fieldset>
              <legend class="etiqueta">¿Cómo quieres que se vea? <span class="text-[#E60000]">*</span></legend>
              <div class="grid sm:grid-cols-2 gap-3">
                <label class="opcion" [class.opcion-activa]="layout() === 'texto_foto'">
                  <input type="radio" formControlName="layout" value="texto_foto" class="sr-only" />
                  <span class="mini mini-texto" aria-hidden="true"><span></span><span></span></span>
                  <span class="block font-semibold text-sm text-[#111827]">Texto y foto</span>
                  <span class="block text-xs text-gray-500">Título, texto corto y botón a la izquierda; una foto a la derecha. Ideal para promociones.</span>
                </label>
                <label class="opcion" [class.opcion-activa]="layout() === 'solo_imagen'">
                  <input type="radio" formControlName="layout" value="solo_imagen" class="sr-only" />
                  <span class="mini mini-imagen" aria-hidden="true"></span>
                  <span class="block font-semibold text-sm text-[#111827]">Solo imagen</span>
                  <span class="block text-xs text-gray-500">Una imagen ancha que ya trae su diseño y textos (hecha en Canva, por ejemplo). Ocupa todo el ancho.</span>
                </label>
              </div>
            </fieldset>

            @if (layout() === 'texto_foto') {
              <div class="grid sm:grid-cols-2 gap-4 mt-5">
                <div class="sm:col-span-2">
                  <label class="etiqueta" for="b-titulo">Título <span class="text-[#E60000]">*</span></label>
                  <input id="b-titulo" type="text" formControlName="title" maxlength="80" class="campo"
                         placeholder="Ej: Gran venta de línea blanca" [class.campo-error]="invalido('title')" />
                  <p class="ayuda">Sale a la izquierda, en letras grandes. Máximo 80 letras.</p>
                  @if (invalido('title')) { <p class="msg-error">Escribe un título.</p> }
                </div>
                <div>
                  <label class="etiqueta" for="b-eyebrow">Etiqueta pequeña <span class="text-gray-400 font-normal">(opcional)</span></label>
                  <input id="b-eyebrow" type="text" formControlName="eyebrow" maxlength="60" class="campo" placeholder="Ej: Solo esta semana" />
                  <p class="ayuda">La frase chiquita que sale encima del título.</p>
                </div>
                <div>
                  <label class="etiqueta">Color de fondo</label>
                  <div class="flex gap-3">
                    <label class="opcion opcion-corta" [class.opcion-activa]="form.value.theme === 'rojo'">
                      <input type="radio" formControlName="theme" value="rojo" class="sr-only" />
                      <span class="inline-block w-5 h-5 rounded-full bg-[#E60000] align-middle mr-2"></span>Rojo
                    </label>
                    <label class="opcion opcion-corta" [class.opcion-activa]="form.value.theme === 'blanco'">
                      <input type="radio" formControlName="theme" value="blanco" class="sr-only" />
                      <span class="inline-block w-5 h-5 rounded-full bg-white border border-gray-300 align-middle mr-2"></span>Blanco
                    </label>
                  </div>
                </div>
                <div class="sm:col-span-2">
                  <label class="etiqueta" for="b-body">Texto <span class="text-gray-400 font-normal">(opcional)</span></label>
                  <textarea id="b-body" formControlName="body" rows="2" maxlength="220" class="campo"
                            placeholder="Ej: Aprovecha precios especiales en refrigeradoras y lavadoras."></textarea>
                  <p class="ayuda">El párrafo corto debajo del título. Máximo 220 letras.</p>
                </div>
              </div>
            }

            <div class="mt-5">
              <label class="etiqueta">
                {{ layout() === 'solo_imagen' ? 'Imagen del banner' : 'Foto' }}
                @if (layout() === 'solo_imagen') { <span class="text-[#E60000]">*</span> } @else { <span class="text-gray-400 font-normal">(opcional)</span> }
              </label>
              <div class="flex flex-wrap items-start gap-4">
                <div class="w-full sm:w-72 aspect-[16/7] rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center text-gray-400 text-sm">
                  @if (vistaPrevia(); as src) {
                    <img [src]="src" alt="Vista previa de la imagen" class="w-full h-full object-cover" />
                  } @else {
                    <span><i class="far fa-image mr-1"></i> Sin imagen</span>
                  }
                </div>
                <div class="min-w-0 flex-1 basis-56">
                  <label class="btn-sec cursor-pointer">
                    <i class="fas fa-upload"></i> {{ vistaPrevia() ? 'Cambiar imagen' : 'Subir imagen' }}
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" class="sr-only" (change)="elegirImagen($event)" />
                  </label>
                  @if (vistaPrevia() && layout() === 'texto_foto') {
                    <button type="button" (click)="quitarImagen()" class="ml-2 text-sm text-gray-500 hover:text-[#E60000] underline">Quitar</button>
                  }
                  @if (errorImagen(); as e) { <p class="msg-error">{{ e }}</p> }
                  <p class="ayuda mt-2">
                    JPG, PNG o WebP, hasta 5 MB (se optimiza sola).<br />
                    @if (layout() === 'solo_imagen') {
                      <strong>Tamaño ideal:</strong> 1600 × 700 píxeles, horizontal. En celulares los bordes se recortan un poco:
                      deja lo importante hacia el centro.
                    } @else {
                      <strong>Tamaño ideal:</strong> casi cuadrada u horizontal, por ejemplo 1000 × 800. Sale dentro de un marco
                      a la derecha del texto. Si no subes foto, se muestra el logo de la tienda.
                    }
                  </p>
                </div>
              </div>
              <div class="mt-3">
                <label class="etiqueta" for="b-alt">Describe la imagen <span class="text-gray-400 font-normal">(recomendado)</span></label>
                <input id="b-alt" type="text" formControlName="image_alt" maxlength="160" class="campo" placeholder="Ej: Refrigeradora Samsung en oferta" />
                <p class="ayuda">No se ve en pantalla: la leen los lectores para personas con discapacidad visual y ayuda a Google.</p>
              </div>
            </div>

            <div class="mt-5 grid sm:grid-cols-2 gap-4">
              <div>
                <label class="etiqueta" for="b-destino">
                  {{ layout() === 'solo_imagen' ? 'Al tocar la imagen, llevar a…' : 'El botón lleva a…' }}
                  <span class="text-gray-400 font-normal">(opcional)</span>
                </label>
                <select id="b-destino" formControlName="destino" class="campo">
                  <option value="">Ninguno (sin enlace)</option>
                  <optgroup label="Secciones de la tienda">
                    @for (d of destinosBase; track d.valor) { <option [value]="d.valor">{{ d.texto }}</option> }
                  </optgroup>
                  @if (categorias().length) {
                    <optgroup label="Una categoría">
                      @for (c of categorias(); track c.id) { <option [value]="'cat:' + c.name">{{ c.name }}</option> }
                    </optgroup>
                  }
                  @if (marcas().length) {
                    <optgroup label="Una marca">
                      @for (m of marcas(); track m.id) { <option [value]="'marca:' + m.name">{{ m.name }}</option> }
                    </optgroup>
                  }
                  <option value="otro">Otro enlace (pegar dirección https://…)</option>
                </select>
              </div>
              @if (layout() === 'texto_foto') {
                <div>
                  <label class="etiqueta" for="b-boton">Texto del botón</label>
                  <input id="b-boton" type="text" formControlName="button_label" maxlength="30" class="campo" placeholder="Ej: Ver ofertas" />
                  <p class="ayuda">Si lo dejas vacío, no se muestra botón.</p>
                </div>
              }
              @if (form.value.destino === 'otro') {
                <div class="sm:col-span-2">
                  <label class="etiqueta" for="b-otro">Dirección del enlace</label>
                  <input id="b-otro" type="url" formControlName="otro_enlace" maxlength="300" class="campo"
                         placeholder="https://..." [class.campo-error]="invalido('otro_enlace')" />
                  @if (invalido('otro_enlace')) { <p class="msg-error">Debe empezar con https://</p> }
                  <p class="ayuda">Se abre en una pestaña nueva.</p>
                </div>
              }
            </div>

            <label class="mt-5 flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 cursor-pointer">
              <input type="checkbox" formControlName="is_active" class="mt-1 w-4 h-4 accent-[#E60000]" />
              <span class="text-sm">
                <span class="font-semibold text-[#111827]">Mostrar este banner en la tienda</span><br />
                <span class="text-gray-500">Si lo desmarcas se guarda pero no se ve. Útil para dejar listo un banner de una fecha especial.</span>
              </span>
            </label>

            <div class="mt-5 flex flex-wrap items-center justify-end gap-3">
              @if (enviado() && form.invalid) { <p role="alert" class="mr-auto text-sm text-red-600">Revisa los campos marcados.</p> }
              <button type="button" (click)="cancelar()" [disabled]="guardando()" class="btn-sec">Cancelar</button>
              <button type="submit" [disabled]="guardando()" class="btn-guardar">
                @if (guardando()) { <i class="fas fa-spinner fa-spin"></i> Guardando… } @else { <i class="fas fa-floppy-disk"></i> Guardar banner }
              </button>
            </div>
          </form>
        }

        @if (banners().length === 0 && editando() === null) {
          <div class="mt-5 rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            <i class="far fa-images text-2xl text-gray-300 block mb-2"></i>
            Aún no tienes banners propios. Pulsa <strong>Nuevo banner</strong> para crear el primero.
          </div>
        }
        @if (banners().length > 0) {
          <ul class="mt-5 space-y-3">
            @for (b of banners(); track b.id; let i = $index; let primero = $first; let ultimo = $last) {
              <li class="flex flex-wrap sm:flex-nowrap items-center gap-3 rounded-xl border border-gray-200 p-3" [class.opacity-60]="!b.is_active">
                <div class="w-24 sm:w-32 shrink-0 aspect-[16/9] rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center text-gray-300">
                  @if (urlImagen(b); as src) { <img [src]="src" alt="" class="w-full h-full object-cover" /> } @else { <i class="far fa-image"></i> }
                </div>
                <div class="min-w-0 flex-1">
                  <p class="font-semibold text-[#111827] truncate">{{ b.title || '(Solo imagen)' }}</p>
                  <p class="text-xs text-gray-500">
                    {{ b.layout === 'solo_imagen' ? 'Solo imagen' : 'Texto y foto · ' + (b.theme === 'blanco' ? 'Blanco' : 'Rojo') }}
                    · Posición {{ i + 1 }}
                    @if (!b.is_active) { · <span class="text-amber-700 font-semibold">Oculto</span> }
                  </p>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <button type="button" (click)="mover(i, -1)" [disabled]="primero || ocupado()" class="icono" aria-label="Mostrar antes" title="Mostrar antes"><i class="fas fa-arrow-up"></i></button>
                  <button type="button" (click)="mover(i, 1)" [disabled]="ultimo || ocupado()" class="icono" aria-label="Mostrar después" title="Mostrar después"><i class="fas fa-arrow-down"></i></button>
                  <button type="button" (click)="alternar(b)" [disabled]="ocupado()" class="icono" [attr.aria-label]="b.is_active ? 'Ocultar' : 'Mostrar'" [title]="b.is_active ? 'Ocultar' : 'Mostrar'">
                    <i class="fas" [class.fa-eye]="b.is_active" [class.fa-eye-slash]="!b.is_active"></i>
                  </button>
                  <button type="button" (click)="editar(b)" [disabled]="ocupado()" class="icono" aria-label="Editar" title="Editar"><i class="fas fa-pen"></i></button>
                  <button type="button" (click)="eliminar(b)" [disabled]="ocupado()" class="icono icono-peligro" aria-label="Eliminar" title="Eliminar"><i class="fas fa-trash"></i></button>
                </div>
              </li>
            }
          </ul>
        }
      </section>

      <!-- ============ 2. Diapositivas que ya tenía la tienda ============ -->
      <section class="mb-6" aria-labelledby="p-auto">
        <h2 id="p-auto" class="font-montserrat font-bold text-lg text-[#111827]">2. Diapositivas que ya tenía tu tienda</h2>
        <p class="text-sm text-gray-600 mt-1 max-w-3xl">
          Estas se arman solas con tus productos y sucursales. Aquí ves <strong>qué foto y qué texto tiene cada una ahora</strong> y,
          si quieres, lo cambias. Siempre puedes volver al original.
        </p>

        @if (!hero()) {
          <p class="mt-3 text-sm text-amber-700 bg-amber-50 rounded-lg p-3">Aún no existen los datos iniciales de la tienda. Avisa a quien administra el sitio.</p>
        } @else {
          <div class="mt-4 flex flex-wrap items-end gap-4 rounded-xl bg-white border border-gray-100 shadow-sm p-4">
            <div>
              <label class="etiqueta" for="h-vel">Velocidad del carrusel</label>
              <select id="h-vel" class="campo" (change)="cambiarVelocidad($any($event.target).value)">
                @for (v of velocidades; track v.seg) { <option [value]="v.seg" [selected]="hero()!.hero_interval_secs === v.seg">{{ v.texto }}</option> }
              </select>
            </div>
            <p class="text-xs text-gray-500 max-w-md">Cada cuánto pasa a la siguiente diapositiva. El cliente también puede moverlas con las flechas.</p>
          </div>

          <div class="mt-5 space-y-5">
            @for (d of definiciones; track d.clave) {
              <article class="rounded-2xl border border-gray-100 shadow-sm bg-white overflow-hidden" [class.opacity-80]="!visible(d)">
                <header class="flex flex-wrap items-start gap-3 p-4 sm:p-5 border-b border-gray-100" [class]="visible(d) ? 'bg-red-50/40' : 'bg-gray-50'">
                  <span class="w-10 h-10 rounded-xl bg-[#E60000] text-white flex items-center justify-center shrink-0">
                    <i class="fas {{ d.icono }}"></i>
                  </span>
                  <div class="min-w-0 flex-1">
                    <h3 class="font-montserrat font-bold text-[#111827]">
                      {{ d.titulo }}
                      @if (numeroDe(d); as n) { <span class="ml-2 text-xs font-semibold text-white bg-[#111827] rounded-full px-2 py-0.5">Diapositiva {{ n }}</span> }
                    </h3>
                    <p class="text-sm text-gray-600 mt-0.5">{{ d.descripcion }}</p>
                  </div>
                  <label class="inline-flex items-center gap-2 text-sm font-medium cursor-pointer shrink-0">
                    <input type="checkbox" class="w-4 h-4 accent-[#E60000]" [checked]="visible(d)" [disabled]="ocupado()" (change)="alternarVisible(d)" />
                    {{ visible(d) ? 'Se muestra' : 'Oculta' }}
                  </label>
                </header>

                <div class="p-4 sm:p-5 space-y-6">

                  <!-- Fotos -->
                  @if (d.clave !== 'asesoria') {
                    <div>
                      <h4 class="font-semibold text-sm text-[#111827] mb-2"><i class="far fa-image text-[#E60000] mr-1"></i> Fotos de esta diapositiva</h4>
                      @if (filasFotos(d.clave).length === 0) {
                        <p class="text-sm text-gray-500">Aún no hay productos con foto para mostrar aquí.</p>
                      }
                      <ul class="space-y-3">
                        @for (f of filasFotos(d.clave); track f.etiqueta) {
                          <li class="flex flex-wrap sm:flex-nowrap items-center gap-3 rounded-xl border border-gray-200 p-3">
                            <span class="w-20 h-20 shrink-0 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center text-gray-300">
                              @if (f.url) { <img [src]="f.url" alt="" class="w-full h-full object-cover" /> } @else { <i class="far fa-image"></i> }
                            </span>
                            <div class="min-w-0 flex-1 text-sm">
                              <p class="font-semibold text-[#111827]">{{ f.etiqueta }}</p>
                              <p class="text-gray-600">Ahora muestra: <strong>{{ f.actual }}</strong></p>
                              @if (!f.propia) {
                                <p class="text-xs text-gray-500">Es la foto del producto, tal como está en tu catálogo.</p>
                              }
                            </div>
                            <div class="flex flex-wrap items-center gap-2 shrink-0">
                              <label class="btn-sec cursor-pointer" [class.pointer-events-none]="ocupado()" [class.opacity-60]="ocupado()">
                                <i class="fas fa-upload"></i> {{ f.propia ? 'Poner otra foto' : 'Poner otra foto en su lugar' }}
                                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" class="sr-only"
                                       (change)="cambiarFoto(f, $event)" />
                              </label>
                              @if (f.propia) {
                                <button type="button" class="text-sm text-gray-600 hover:text-[#E60000] underline" [disabled]="ocupado()" (click)="volverFoto(f)">
                                  Volver a la original
                                </button>
                              }
                            </div>
                          </li>
                        }
                      </ul>
                      <p class="text-xs text-gray-500 mt-2">
                        JPG, PNG o WebP, hasta 5 MB. La foto nueva se guarda al instante y reemplaza solo esa posición;
                        el producto, su precio y su enlace no cambian.
                      </p>
                    </div>
                  } @else {
                    <div class="rounded-xl bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700">
                      <i class="fas fa-user-circle text-[#E60000] mr-1"></i>
                      Las <strong>fotos, nombres y WhatsApp</strong> de los asesores se cambian en
                      <a routerLink="/admin/tienda" class="font-semibold text-[#E60000] underline">Tienda y sucursales</a>.
                      Aquí solo cambias los textos de esta diapositiva.
                    </div>
                  }

                  <!-- Textos -->
                  <form [formGroup]="formDe(d.clave)" (ngSubmit)="guardarTextos(d)" novalidate>
                    <h4 class="font-semibold text-sm text-[#111827] mb-1"><i class="fas fa-font text-[#E60000] mr-1"></i> Textos de esta diapositiva</h4>
                    <p class="text-xs text-gray-500 mb-3">Están escritos tal como se ven ahora en la tienda. Cámbialos y pulsa guardar.</p>
                    <div class="grid sm:grid-cols-2 gap-4">
                      @for (c of d.campos; track c.campo) {
                        <div [class.sm:col-span-2]="c.area">
                          <label class="etiqueta" [for]="d.clave + '-' + c.campo">{{ c.etiqueta }}</label>
                          @if (c.area) {
                            <textarea [id]="d.clave + '-' + c.campo" [formControlName]="c.campo" rows="2" [attr.maxlength]="c.max" class="campo"></textarea>
                          } @else {
                            <input [id]="d.clave + '-' + c.campo" type="text" [formControlName]="c.campo" [attr.maxlength]="c.max" class="campo" />
                          }
                          <p class="ayuda">
                            Sale {{ c.donde }}.
                            @if (campoCambiado(d.clave, c.campo)) {
                              <button type="button" class="ml-1 text-[#E60000] underline" (click)="restaurarCampo(d.clave, c.campo)">Poner el original</button>
                            }
                          </p>
                        </div>
                      }
                    </div>

                    @if (d.clave === 'bienvenida') {
                      <div class="mt-4">
                        <span class="etiqueta">Lista con ✓ <span class="text-gray-400 font-normal">(hasta 4 puntos)</span></span>
                        <div class="grid sm:grid-cols-2 gap-3">
                          @for (n of puntosLista; track n) {
                            <input type="text" [formControlName]="'b' + n" maxlength="40" class="campo" [attr.aria-label]="'Punto ' + n" />
                          }
                        </div>
                        <p class="ayuda">Salen debajo del texto, cada uno con una palomita. Deja vacío el que no quieras mostrar.</p>
                      </div>
                    }

                    <div class="mt-4 flex flex-wrap items-center justify-end gap-3">
                      @if (personalizada(d.clave)) {
                        <button type="button" (click)="volverOriginal(d)" [disabled]="ocupado()" class="btn-sec mr-auto">
                          <i class="fas fa-rotate-left"></i> Volver todo al original
                        </button>
                      }
                      <button type="submit" [disabled]="ocupado()" class="btn-guardar">
                        @if (guardandoTextos() === d.clave) { <i class="fas fa-spinner fa-spin"></i> Guardando… } @else { <i class="fas fa-floppy-disk"></i> Guardar textos }
                      </button>
                    </div>
                  </form>
                </div>
              </article>
            }
          </div>
        }
      </section>

      <p class="text-xs text-gray-500">
        Los cambios se guardan al instante; en la tienda pública pueden tardar unos minutos en verse.
        Revisa siempre la portada en tu celular después de cambiar algo.
      </p>
    }
  `,
  styles: [`
    :host { display: block; }
    .etiqueta { display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }
    .campo { width: 100%; border-radius: 0.5rem; border: 1px solid #d1d5db; padding: 0.55rem 0.75rem; font-size: 0.95rem; background: #fff; }
    .campo:focus { outline: none; box-shadow: 0 0 0 2px rgba(230, 0, 0, 0.25); border-color: #E60000; }
    .campo-error { border-color: #f87171; }
    .msg-error { font-size: 0.75rem; color: #dc2626; margin-top: 0.25rem; }
    .ayuda { font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem; line-height: 1.4; }
    .btn-guardar { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.625rem 1.25rem;
      border-radius: 0.5rem; background: #E60000; color: #fff; font-size: 0.875rem; font-weight: 600; transition: background-color .15s; }
    .btn-guardar:hover { background: #c40000; }
    .btn-guardar:disabled { opacity: .7; cursor: not-allowed; }
    .btn-sec { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.55rem 1rem; border-radius: 0.5rem;
      border: 1px solid #d1d5db; background: #fff; color: #374151; font-size: 0.875rem; font-weight: 500; }
    .btn-sec:hover { background: #f9fafb; }
    .opcion { display: block; border: 2px solid #e5e7eb; border-radius: 0.75rem; padding: 0.75rem; cursor: pointer; background: #fff; }
    .opcion-activa { border-color: #E60000; background: #fff5f5; }
    .opcion-corta { display: inline-flex; align-items: center; padding: 0.5rem 0.9rem; font-size: 0.875rem; font-weight: 500; }
    .mini { display: flex; gap: 6px; width: 100%; height: 46px; border-radius: 6px; background: #E60000; margin-bottom: 0.5rem; padding: 8px; }
    .mini-texto span:first-child { flex: 1.2; background: rgba(255,255,255,.85); border-radius: 3px; }
    .mini-texto span:last-child { flex: 1; background: rgba(255,255,255,.45); border-radius: 3px; }
    .mini-imagen { background: linear-gradient(135deg, #fecaca, #E60000); }
    .icono { width: 2.1rem; height: 2.1rem; border-radius: 0.5rem; border: 1px solid #e5e7eb; background: #fff; color: #374151; }
    .icono:hover:not(:disabled) { background: #f3f4f6; }
    .icono:disabled { opacity: .35; cursor: not-allowed; }
    .icono-peligro { color: #E60000; }
  `]
})
export class AdminPortadaComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly portada = inject(AdminPortadaService);
  private readonly catalogo = inject(AdminCatalogoService);
  private readonly repo = inject(ProductRepository);
  private readonly ui = inject(AdminUiService);

  readonly definiciones = SLIDES;
  readonly destinosBase = DESTINOS_BASE;
  readonly velocidades = VELOCIDADES;
  readonly puntosLista = [1, 2, 3, 4];

  readonly cargando = signal(true);
  readonly errorCarga = signal<string | null>(null);
  readonly ocupado = signal(false);
  readonly guardandoTextos = signal<ClaveSlide | null>(null);

  readonly banners = signal<BannerAdmin[]>([]);
  readonly categorias = signal<OpcionCatalogo[]>([]);
  readonly marcas = signal<OpcionCatalogo[]>([]);
  readonly hero = signal<AjustesHero | null>(null);
  readonly slides = signal<Partial<Record<ClaveSlide, SlideAdmin>>>({});
  readonly fotos = signal<Record<string, FotoPropia>>({});
  private readonly productos = signal<Producto[]>([]);

  // ---------------------------------------------------------------- lo que la tienda mostrará
  private readonly tieneFoto = (p: Producto): boolean => !!p.imagenes[0]?.url;
  private readonly promos = computed(() => seleccionarPromos(this.productos(), this.tieneFoto));
  private readonly vitrina = computed(() => seleccionarVitrina(this.productos(), this.tieneFoto));
  private readonly portadaProducto = computed(() => seleccionarPortada(this.productos(), this.tieneFoto));
  readonly mayorDescuento = computed(() => mayorDescuento(this.productos()));

  /** Textos "como se ven ahora": los guardados o, si no hay, los originales. */
  private readonly sucursales = STORE_CONFIG.sucursales.length;

  // ---------------------------------------------------------------- formularios de textos
  private readonly formularios: Record<ClaveSlide, FormGroup> = {
    ofertas: this.crearFormTexto(),
    bienvenida: this.crearFormTexto(),
    promos: this.crearFormTexto(),
    asesoria: this.crearFormTexto()
  };

  // ---------------------------------------------------------------- banner propio (editor)
  readonly editando = signal<string | 'nuevo' | null>(null);
  readonly guardando = signal(false);
  readonly enviado = signal(false);
  readonly layout = signal<LayoutBanner>('texto_foto');
  readonly vistaPrevia = signal<string | null>(null);
  readonly errorImagen = signal<string | null>(null);

  private archivoNuevo: File | null = null;
  private imagenQuitada = false;
  private urlObjeto: string | null = null;

  readonly form = this.fb.nonNullable.group({
    layout: ['texto_foto' as LayoutBanner],
    theme: ['rojo' as 'rojo' | 'blanco'],
    eyebrow: ['', Validators.maxLength(60)],
    title: ['', [Validators.maxLength(80), noVacio]],
    body: ['', Validators.maxLength(220)],
    button_label: ['', Validators.maxLength(30)],
    destino: [''],
    otro_enlace: ['', [Validators.maxLength(300), https]],
    image_alt: ['', Validators.maxLength(160)],
    is_active: [true]
  });

  ngOnInit(): void {
    this.form.controls.layout.valueChanges.subscribe(v => this.layout.set(v));
    void this.cargar();
  }

  ngOnDestroy(): void {
    this.liberarVistaPrevia();
  }

  private crearFormTexto(): FormGroup {
    return this.fb.nonNullable.group({
      eyebrow: [''],
      title: [''],
      subtitle: [''],
      body: [''],
      button_label: [''],
      b1: [''],
      b2: [''],
      b3: [''],
      b4: ['']
    });
  }

  formDe(clave: ClaveSlide): FormGroup {
    return this.formularios[clave];
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.errorCarga.set(null);
    try {
      const [banners, hero, cats, marcas, slides, fotos, productos] = await Promise.all([
        this.portada.listarBanners(),
        this.portada.obtenerHero(),
        this.catalogo.listarCategorias(),
        this.catalogo.listarMarcas(),
        this.portada.listarSlides(),
        this.portada.listarFotos(),
        firstValueFrom(this.repo.getAll())
      ]);
      this.banners.set(banners);
      this.hero.set(hero);
      this.categorias.set(cats.filter(c => c.is_active));
      this.marcas.set(marcas.filter(m => m.is_active));
      this.slides.set(slides);
      this.fotos.set(fotos);
      this.productos.set(productos);
      this.cargarFormularios();
    } catch (e) {
      this.errorCarga.set(e instanceof ErrorAdmin ? e.message : 'No se pudo cargar la portada.');
    } finally {
      this.cargando.set(false);
    }
  }

  // ================================================================== diapositivas automáticas

  /** Valores ORIGINALES (los de la tienda sin personalizar) de cada campo. */
  private originales(clave: ClaveSlide): Record<CampoTexto, string> & { lista: string[] } {
    const O = TEXTOS_ORIGINALES;
    switch (clave) {
      case 'ofertas':
        return { title: O.ofertas.titulo, subtitle: O.ofertas.sub, eyebrow: O.ofertas.pre, body: O.ofertas.pill, button_label: O.ofertas.boton, lista: [] };
      case 'bienvenida':
        return {
          eyebrow: O.bienvenida.chip(this.sucursales),
          title: O.bienvenida.titulo,
          subtitle: O.bienvenida.acento,
          body: O.bienvenida.texto,
          button_label: O.bienvenida.boton,
          lista: [...O.bienvenida.lista]
        };
      case 'promos':
        return { eyebrow: '', title: '', subtitle: '', body: '', button_label: O.promos.boton, lista: [] };
      case 'asesoria':
        return { eyebrow: O.asesoria.chip, title: O.asesoria.titulo, subtitle: '', body: O.asesoria.texto, button_label: O.asesoria.boton, lista: [] };
    }
  }

  /** Rellena cada formulario con el texto que HOY se ve en la tienda. */
  private cargarFormularios(): void {
    for (const d of SLIDES) {
      const o = this.originales(d.clave);
      const s = this.slides()[d.clave];
      const lista = s?.bullets?.length ? s.bullets : o.lista;
      this.formularios[d.clave].reset({
        eyebrow: s?.eyebrow || o.eyebrow,
        title: s?.title || o.title,
        subtitle: s?.subtitle || o.subtitle,
        body: s?.body || o.body,
        button_label: s?.button_label || o.button_label,
        b1: lista[0] ?? '',
        b2: lista[1] ?? '',
        b3: lista[2] ?? '',
        b4: lista[3] ?? ''
      });
    }
  }

  visible(d: DefinicionSlide): boolean {
    const h = this.hero();
    return !!h && h[d.visible];
  }

  /** Número de la diapositiva en el carrusel (null si está oculta o no hay nada que mostrar). */
  numeroDe(d: DefinicionSlide): number | null {
    const h = this.hero();
    if (!h || !h[d.visible]) return null;
    const promos = this.promos().length;
    const orden: { clave: ClaveSlide; cuenta: number }[] = [
      { clave: 'ofertas', cuenta: h.hero_show_offers && promos > 0 ? 1 : 0 },
      { clave: 'bienvenida', cuenta: h.hero_show_welcome ? 1 : 0 },
      { clave: 'promos', cuenta: h.hero_show_promos ? promos : 0 },
      { clave: 'asesoria', cuenta: h.hero_show_advisors ? 1 : 0 }
    ];
    let n = this.banners().filter(b => b.is_active).length;
    for (const x of orden) {
      if (x.clave === d.clave) return x.cuenta > 0 ? n + 1 : null;
      n += x.cuenta;
    }
    return null;
  }

  filasFotos(clave: ClaveSlide): FilaFoto[] {
    const fotos = this.fotos();
    const url = (p: Producto) => p.imagenes[0]?.url ?? null;
    if (clave === 'ofertas') {
      return this.vitrina().slice(0, MAX_VITRINA).map((p, k) => {
        const propia = fotos[claveFoto('ofertas', k + 1)] ?? null;
        return {
          slide: 'ofertas', slot: k + 1,
          etiqueta: `Foto ${k + 1} del banner de ofertas`,
          actual: propia ? 'tu foto' : `foto del producto "${p.nombre}"`,
          url: propia?.url ?? url(p), propia
        };
      });
    }
    if (clave === 'bienvenida') {
      const propia = fotos[claveFoto('bienvenida', 1)] ?? null;
      const p = this.portadaProducto();
      return [{
        slide: 'bienvenida', slot: 1,
        etiqueta: 'Foto principal de la bienvenida',
        actual: propia ? 'tu foto' : p ? `foto del producto "${p.nombre}"` : 'sin foto',
        url: propia?.url ?? (p ? url(p) : null), propia
      }];
    }
    if (clave === 'promos') {
      return this.promos().slice(0, MAX_PROMOS).map((p, i) => {
        const propia = fotos[claveFoto('promos', i + 1)] ?? null;
        return {
          slide: 'promos', slot: i + 1,
          etiqueta: `Diapositiva de oferta ${i + 1}: ${p.nombre}`,
          actual: propia ? 'tu foto' : 'la foto del producto',
          url: propia?.url ?? url(p), propia
        };
      });
    }
    return [];
  }

  personalizada(clave: ClaveSlide): boolean {
    if (this.slides()[clave]) return true;
    return Object.keys(this.fotos()).some(k => k.startsWith(clave + ':'));
  }

  /** ¿El campo es distinto del original? (para ofrecer "Poner el original") */
  campoCambiado(clave: ClaveSlide, campo: CampoTexto): boolean {
    const actual = normaliza(this.formularios[clave].get(campo)?.value ?? '');
    return actual !== normaliza(this.originales(clave)[campo]);
  }

  restaurarCampo(clave: ClaveSlide, campo: CampoTexto): void {
    this.formularios[clave].get(campo)?.setValue(this.originales(clave)[campo]);
  }

  async alternarVisible(d: DefinicionSlide): Promise<void> {
    const h = this.hero();
    if (!h) return;
    const nuevo = { ...h, [d.visible]: !h[d.visible] };
    await this.accion(async () => {
      await this.portada.guardarHero(nuevo);
      this.hero.set(nuevo);
      this.ui.ok(nuevo[d.visible] ? `"${d.titulo}" se muestra en la tienda.` : `"${d.titulo}" quedó oculta.`);
    }, false);
  }

  async cambiarVelocidad(valor: string): Promise<void> {
    const h = this.hero();
    if (!h) return;
    const nuevo = { ...h, hero_interval_secs: Number(valor) };
    await this.accion(async () => {
      await this.portada.guardarHero(nuevo);
      this.hero.set(nuevo);
      this.ui.ok('Velocidad guardada.');
    }, false);
  }

  async guardarTextos(d: DefinicionSlide): Promise<void> {
    const f = this.formularios[d.clave].getRawValue() as Record<string, string>;
    const o = this.originales(d.clave);
    // Un campo igual al original se guarda como "sin cambio" (null): así la tienda sigue usando el original
    const campo = (c: CampoTexto): string | null => {
      if (!d.campos.some(x => x.campo === c)) return null;
      const v = normaliza(f[c] ?? '');
      return v === '' || v === normaliza(o[c]) ? null : v;
    };
    let bullets: string[] | null = null;
    if (d.clave === 'bienvenida') {
      const lista = [f['b1'], f['b2'], f['b3'], f['b4']].map(x => (x ?? '').trim()).filter(Boolean);
      const igual = lista.length === o.lista.length && lista.every((x, i) => x === o.lista[i]);
      bullets = lista.length > 0 && !igual ? lista : null;
    }
    this.guardandoTextos.set(d.clave);
    try {
      await this.portada.guardarSlide(d.clave, {
        eyebrow: campo('eyebrow'),
        title: campo('title'),
        subtitle: campo('subtitle'),
        body: campo('body'),
        bullets,
        button_label: campo('button_label')
      });
      this.slides.set(await this.portada.listarSlides());
      this.ui.ok(`Textos de "${d.titulo}" guardados.`);
    } catch (e) {
      this.ui.error(e instanceof ErrorAdmin ? e.message : 'No se pudieron guardar los textos.');
    } finally {
      this.guardandoTextos.set(null);
    }
  }

  async volverOriginal(d: DefinicionSlide): Promise<void> {
    const ok = await this.ui.confirmar({
      titulo: 'Volver todo al original',
      mensaje: `"${d.titulo}" volverá a verse exactamente como al inicio: se borrarán tus textos y tus fotos de esta diapositiva.`,
      confirmar: 'Volver al original'
    });
    if (!ok) return;
    const propias = Object.entries(this.fotos())
      .filter(([k]) => k.startsWith(d.clave + ':'))
      .map(([, v]) => v);
    await this.accion(async () => {
      await this.portada.restaurarSlide(d.clave, propias);
      await this.recargarSlides();
      this.ui.ok(`"${d.titulo}" volvió al original.`);
    }, false);
  }

  async cambiarFoto(f: FilaFoto, ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    input.value = '';
    if (!archivo) return;
    const problema = this.portada.validarArchivo(archivo);
    if (problema) {
      this.ui.error(problema);
      return;
    }
    await this.accion(async () => {
      await this.portada.ponerFoto(f.slide, f.slot, archivo, f.propia);
      this.fotos.set(await this.portada.listarFotos());
      this.ui.ok('Foto cambiada. Ya se usa en esa posición.');
    }, false);
  }

  async volverFoto(f: FilaFoto): Promise<void> {
    if (!f.propia) return;
    const propia = f.propia;
    await this.accion(async () => {
      await this.portada.quitarFoto(f.slide, f.slot, propia);
      this.fotos.set(await this.portada.listarFotos());
      this.ui.ok('Volvió la foto original.');
    }, false);
  }

  private async recargarSlides(): Promise<void> {
    const [slides, fotos] = await Promise.all([this.portada.listarSlides(), this.portada.listarFotos()]);
    this.slides.set(slides);
    this.fotos.set(fotos);
    this.cargarFormularios();
  }

  // ================================================================== banners propios

  invalido(campo: 'title' | 'otro_enlace'): boolean {
    const c = this.form.controls[campo];
    if (campo === 'title' && this.layout() !== 'texto_foto') return false;
    if (campo === 'otro_enlace' && this.form.controls.destino.value !== 'otro') return false;
    const vacioInvalido = campo === 'title' && !c.value.trim();
    return (c.invalid || vacioInvalido) && (c.touched || this.enviado());
  }

  urlImagen(b: BannerAdmin): string | null {
    return this.portada.urlImagen(b.image_path);
  }

  nuevoBanner(): void {
    this.prepararEditor('nuevo', null);
  }

  editar(b: BannerAdmin): void {
    this.prepararEditor(b.id, b);
  }

  cancelar(): void {
    this.liberarVistaPrevia();
    this.editando.set(null);
  }

  private prepararEditor(id: string, b: BannerAdmin | null): void {
    this.liberarVistaPrevia();
    this.archivoNuevo = null;
    this.imagenQuitada = false;
    this.enviado.set(false);
    this.errorImagen.set(null);
    const link = b?.button_link ?? '';
    const destino = this.destinoDesdeLink(link);
    this.form.reset({
      layout: b?.layout ?? 'texto_foto',
      theme: b?.theme ?? 'rojo',
      eyebrow: b?.eyebrow ?? '',
      title: b?.title ?? '',
      body: b?.body ?? '',
      button_label: b?.button_label ?? '',
      destino,
      otro_enlace: destino === 'otro' ? link : '',
      image_alt: b?.image_alt ?? '',
      is_active: b?.is_active ?? true
    });
    this.layout.set(b?.layout ?? 'texto_foto');
    this.vistaPrevia.set(b ? this.portada.urlImagen(b.image_path) : null);
    this.editando.set(id);
  }

  private destinoDesdeLink(link: string): string {
    if (!link) return '';
    if (this.destinosBase.some(d => d.valor === link)) return link;
    if (link.startsWith('/catalogo?')) {
      const q = new URLSearchParams(link.split('?')[1]);
      const cat = q.get('categoria');
      if (cat && q.size === 1) return 'cat:' + cat;
      const marca = q.get('marca');
      if (marca && q.size === 1) return 'marca:' + marca;
    }
    return 'otro';
  }

  private linkDesdeDestino(destino: string, otro: string): string | null {
    if (!destino) return null;
    if (destino === 'otro') return otro.trim() || null;
    if (destino.startsWith('cat:')) return '/catalogo?categoria=' + encodeURIComponent(destino.slice(4));
    if (destino.startsWith('marca:')) return '/catalogo?marca=' + encodeURIComponent(destino.slice(6));
    return destino;
  }

  elegirImagen(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    input.value = '';
    if (!archivo) return;
    const problema = this.portada.validarArchivo(archivo);
    if (problema) {
      this.errorImagen.set(problema);
      return;
    }
    this.errorImagen.set(null);
    this.liberarVistaPrevia();
    this.archivoNuevo = archivo;
    this.imagenQuitada = false;
    this.urlObjeto = URL.createObjectURL(archivo);
    this.vistaPrevia.set(this.urlObjeto);
  }

  quitarImagen(): void {
    this.liberarVistaPrevia();
    this.archivoNuevo = null;
    this.imagenQuitada = true;
    this.vistaPrevia.set(null);
  }

  private liberarVistaPrevia(): void {
    if (this.urlObjeto) URL.revokeObjectURL(this.urlObjeto);
    this.urlObjeto = null;
  }

  async guardarBanner(): Promise<void> {
    this.enviado.set(true);
    const v = this.form.getRawValue();
    const textoFoto = v.layout === 'texto_foto';
    const actual = this.editando() === 'nuevo' ? null : (this.banners().find(b => b.id === this.editando()) ?? null);

    const tieneImagen = !!this.archivoNuevo || (!!actual?.image_path && !this.imagenQuitada);
    if (this.form.controls.otro_enlace.invalid && v.destino === 'otro') return this.form.markAllAsTouched();
    if (textoFoto && !v.title.trim()) return this.form.markAllAsTouched();
    if (!textoFoto && !tieneImagen) {
      this.errorImagen.set('El banner "Solo imagen" necesita una imagen.');
      return;
    }
    if (v.destino === 'otro' && !v.otro_enlace.trim()) {
      this.form.controls.otro_enlace.markAsTouched();
      this.form.controls.otro_enlace.setErrors({ url: true });
      return;
    }

    const link = this.linkDesdeDestino(v.destino, v.otro_enlace);
    const vacio = (x: string) => (x.trim() ? x.trim() : null);
    const payload: BannerPayload = {
      layout: v.layout,
      theme: v.theme,
      eyebrow: textoFoto ? vacio(v.eyebrow) : null,
      title: textoFoto ? v.title.trim() : null,
      body: textoFoto ? vacio(v.body) : null,
      button_label: textoFoto && link ? (vacio(v.button_label) ?? 'Ver más') : null,
      button_link: link,
      image_alt: vacio(v.image_alt),
      is_active: v.is_active
    };

    this.guardando.set(true);
    try {
      if (actual) {
        await this.portada.actualizarBanner(actual, payload, this.archivoNuevo, this.imagenQuitada);
      } else {
        const orden = this.banners().reduce((m, b) => Math.max(m, b.sort_order), -1) + 1;
        await this.portada.crearBanner(payload, this.archivoNuevo, orden);
      }
      this.ui.ok('Banner guardado.');
      this.cancelar();
      this.banners.set(await this.portada.listarBanners());
    } catch (e) {
      this.ui.error(e instanceof ErrorAdmin ? e.message : 'No se pudo guardar el banner.');
    } finally {
      this.guardando.set(false);
    }
  }

  async alternar(b: BannerAdmin): Promise<void> {
    await this.accion(async () => {
      await this.portada.cambiarActivo(b.id, !b.is_active);
      this.ui.ok(b.is_active ? 'Banner oculto.' : 'Banner visible.');
    });
  }

  async mover(indice: number, delta: -1 | 1): Promise<void> {
    const lista = [...this.banners()];
    const destino = indice + delta;
    if (destino < 0 || destino >= lista.length) return;
    [lista[indice], lista[destino]] = [lista[destino], lista[indice]];
    await this.accion(async () => {
      await this.portada.ordenar(lista.map(b => b.id));
    });
  }

  async eliminar(b: BannerAdmin): Promise<void> {
    const ok = await this.ui.confirmar({
      titulo: 'Eliminar banner',
      mensaje: `Se eliminará "${b.title || 'el banner de solo imagen'}" y su imagen. Esta acción no se puede deshacer. Si solo quieres dejar de mostrarlo, mejor ocúltalo.`,
      confirmar: 'Eliminar',
      peligro: true
    });
    if (!ok) return;
    await this.accion(async () => {
      await this.portada.eliminarBanner(b);
      if (this.editando() === b.id) this.cancelar();
      this.ui.ok('Banner eliminado.');
    });
  }

  /** Ejecuta una acción con el panel bloqueado; si `recargarBanners`, refresca la lista de banners. */
  private async accion(fn: () => Promise<void>, recargarBanners = true): Promise<void> {
    this.ocupado.set(true);
    try {
      await fn();
      if (recargarBanners) this.banners.set(await this.portada.listarBanners());
    } catch (e) {
      this.ui.error(e instanceof ErrorAdmin ? e.message : 'No se pudo completar la acción.');
    } finally {
      this.ocupado.set(false);
    }
  }
}
