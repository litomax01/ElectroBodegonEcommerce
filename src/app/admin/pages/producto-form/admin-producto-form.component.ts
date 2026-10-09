import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminCatalogoService, ErrorAdmin } from '../../data/admin-catalogo.service';
import { AdminUiService } from '../../core/admin-ui.service';
import { DISPONIBILIDADES, ImagenAdmin, OpcionCatalogo, ProductoAdminRow, ProductoPayload } from '../../data/admin.models';
import { SLUG_REGEX, slugify } from '../../../core/models/producto.helpers';
import { ProductoImagenesComponent } from './producto-imagenes.component';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** price > compare_at_price no es válido: el esquema exige compare_at_price > price. */
const precioOriginalCoherente: ValidatorFn = (g: AbstractControl): ValidationErrors | null => {
  const precio = g.get('price')?.value as number | null;
  const original = g.get('compare_at_price')?.value as number | null;
  if (original === null || original === undefined || precio === null || precio === undefined) return null;
  return original > precio ? null : { precioOriginal: true };
};

const noVacio: ValidatorFn = c => (typeof c.value === 'string' && c.value.length > 0 && c.value.trim() === '' ? { vacio: true } : null);

interface CampoTexto { clave: string; etiqueta: string; max: number; ayuda?: string }
interface CampoNumero { clave: string; etiqueta: string; unidad: string }

type EstadoSlug = 'idle' | 'verificando' | 'libre' | 'ocupado';

@Component({
  selector: 'app-admin-producto-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, ProductoImagenesComponent],
  template: `
    <header class="mb-6">
      <a routerLink="/admin/productos" class="text-sm text-gray-500 hover:text-[#E60000]"><i class="fas fa-arrow-left mr-1"></i> Productos</a>
      <h1 class="font-montserrat font-extrabold text-2xl text-[#111827] mt-1">{{ esNuevo ? 'Nuevo producto' : 'Editar producto' }}</h1>
      @if (!esNuevo && producto(); as p) {
        <p class="text-sm text-gray-500 break-all">{{ p.name }}</p>
      }
    </header>

    @if (cargando()) {
      <div class="space-y-3" aria-busy="true"><div class="h-40 bg-white rounded-2xl animate-pulse"></div><div class="h-40 bg-white rounded-2xl animate-pulse"></div></div>
    } @else if (errorCarga()) {
      <div role="alert" class="rounded-2xl bg-white border border-gray-100 p-8 text-center">
        <i class="fas fa-circle-exclamation text-3xl text-gray-300"></i>
        <p class="mt-3 text-gray-700">{{ errorCarga() }}</p>
        <a routerLink="/admin/productos" class="mt-3 inline-block text-[#E60000] font-medium hover:underline">Volver al listado</a>
      </div>
    } @else {
      <form [formGroup]="form" (ngSubmit)="guardar()" novalidate class="space-y-5 pb-24">

        <!-- Información básica -->
        <section class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4" aria-labelledby="s-basica">
          <h2 id="s-basica" class="font-montserrat font-bold text-lg text-[#111827]">Información básica</h2>

          <div>
            <label for="name" class="etiqueta">Nombre <span class="text-[#E60000]">*</span></label>
            <input id="name" type="text" formControlName="name" maxlength="200" class="campo" [class.campo-error]="invalido('name')" (input)="alEscribirNombre()" />
            @if (invalido('name')) { <p class="msg-error">{{ errorDe('name') }}</p> }
          </div>

          <div>
            <label for="slug" class="etiqueta">Slug (URL) <span class="text-[#E60000]">*</span></label>
            <input id="slug" type="text" formControlName="slug" maxlength="120" autocomplete="off" spellcheck="false"
                   class="campo font-mono text-sm" [class.campo-error]="invalido('slug') || estadoSlug() === 'ocupado'" (input)="alEscribirSlug()" />
            <p class="text-xs mt-1 text-gray-500">
              /producto/{{ form.controls['slug'].value || '…' }}
              @switch (estadoSlug()) {
                @case ('verificando') { <span class="ml-2"><i class="fas fa-spinner fa-spin"></i> verificando…</span> }
                @case ('libre') { <span class="ml-2 text-green-700"><i class="fas fa-check"></i> disponible</span> }
                @case ('ocupado') { <span class="ml-2 text-red-600"><i class="fas fa-xmark"></i> ya está en uso</span> }
              }
            </p>
            @if (invalido('slug')) { <p class="msg-error">{{ errorDe('slug') }}</p> }
            @if (!esNuevo && slugCambiado()) {
              <p class="text-xs mt-1 text-amber-700"><i class="fas fa-triangle-exclamation mr-1"></i>Cambiar el slug cambia la URL del producto: los enlaces anteriores dejarán de funcionar.</p>
            }
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div class="flex items-center justify-between">
                <label for="brand_id" class="etiqueta">Marca <span class="text-[#E60000]">*</span></label>
                <button type="button" (click)="abrirNuevaOpcion('marca')" class="text-xs text-[#E60000] font-medium hover:underline">+ Nueva</button>
              </div>
              <select id="brand_id" formControlName="brand_id" class="campo bg-white" [class.campo-error]="invalido('brand_id')">
                <option value="">Selecciona una marca</option>
                @for (m of marcas(); track m.id) { <option [value]="m.id">{{ m.name }}{{ m.is_active ? '' : ' (inactiva)' }}</option> }
              </select>
              @if (invalido('brand_id')) { <p class="msg-error">Selecciona una marca.</p> }
            </div>
            <div>
              <div class="flex items-center justify-between">
                <label for="category_id" class="etiqueta">Categoría <span class="text-[#E60000]">*</span></label>
                <button type="button" (click)="abrirNuevaOpcion('categoria')" class="text-xs text-[#E60000] font-medium hover:underline">+ Nueva</button>
              </div>
              <select id="category_id" formControlName="category_id" class="campo bg-white" [class.campo-error]="invalido('category_id')">
                <option value="">Selecciona una categoría</option>
                @for (c of categorias(); track c.id) { <option [value]="c.id">{{ c.name }}{{ c.is_active ? '' : ' (inactiva)' }}</option> }
              </select>
              @if (invalido('category_id')) { <p class="msg-error">Selecciona una categoría.</p> }
            </div>
          </div>

          @if (nuevaOpcion(); as tipo) {
            <div class="rounded-xl bg-gray-50 border border-gray-200 p-3 flex flex-col sm:flex-row gap-2 sm:items-end">
              <div class="flex-1">
                <label for="nueva-opcion" class="etiqueta">Nueva {{ tipo }}</label>
                <input id="nueva-opcion" type="text" #nuevoNombre maxlength="80" class="campo" placeholder="Nombre"
                       (keydown.enter)="$event.preventDefault(); crearOpcion(tipo, nuevoNombre.value)" />
              </div>
              <div class="flex gap-2">
                <button type="button" (click)="crearOpcion(tipo, nuevoNombre.value)" [disabled]="creandoOpcion()"
                        class="px-4 py-2 rounded-lg bg-[#111827] text-white text-sm font-semibold disabled:opacity-60">{{ creandoOpcion() ? 'Creando…' : 'Crear' }}</button>
                <button type="button" (click)="nuevaOpcion.set(null)" class="px-4 py-2 rounded-lg border border-gray-300 text-sm">Cancelar</button>
              </div>
              @if (errorOpcion()) { <p class="msg-error sm:basis-full">{{ errorOpcion() }}</p> }
            </div>
          }

          <div>
            <label for="badge" class="etiqueta">Etiqueta <span class="text-gray-400 font-normal">(opcional, ej. "-18%" o "Nuevo")</span></label>
            <input id="badge" type="text" formControlName="badge" maxlength="30" class="campo sm:max-w-xs" [class.campo-error]="invalido('badge')" />
            @if (invalido('badge')) { <p class="msg-error">{{ errorDe('badge') }}</p> }
          </div>

          <div>
            <label for="short_description" class="etiqueta">Descripción corta <span class="text-gray-400 font-normal">(máx. 300)</span></label>
            <textarea id="short_description" formControlName="short_description" rows="2" maxlength="300" class="campo" [class.campo-error]="invalido('short_description')"></textarea>
            @if (invalido('short_description')) { <p class="msg-error">{{ errorDe('short_description') }}</p> }
          </div>

          <div>
            <label for="description" class="etiqueta">Descripción larga <span class="text-gray-400 font-normal">(opcional)</span></label>
            <textarea id="description" formControlName="description" rows="6" maxlength="10000" class="campo" [class.campo-error]="invalido('description')"></textarea>
            @if (invalido('description')) { <p class="msg-error">{{ errorDe('description') }}</p> }
          </div>
        </section>

        <!-- Precio -->
        <section class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" aria-labelledby="s-precio">
          <h2 id="s-precio" class="font-montserrat font-bold text-lg text-[#111827] mb-4">Precio</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="price" class="etiqueta">Precio actual (USD) <span class="text-[#E60000]">*</span></label>
              <input id="price" type="number" formControlName="price" min="0" step="0.01" inputmode="decimal" class="campo" [class.campo-error]="invalido('price')" />
              @if (invalido('price')) { <p class="msg-error">{{ errorDe('price') }}</p> }
            </div>
            <div>
              <label for="compare_at_price" class="etiqueta">Precio original (USD) <span class="text-gray-400 font-normal">(opcional)</span></label>
              <input id="compare_at_price" type="number" formControlName="compare_at_price" min="0" step="0.01" inputmode="decimal" class="campo"
                     [class.campo-error]="invalido('compare_at_price') || (form.hasError('precioOriginal') && form.controls['compare_at_price'].touched)" />
              @if (invalido('compare_at_price')) { <p class="msg-error">{{ errorDe('compare_at_price') }}</p> }
              @else if (form.hasError('precioOriginal') && form.controls['compare_at_price'].touched) {
                <p class="msg-error">Debe ser mayor que el precio actual (o déjalo vacío si no hay oferta).</p>
              }
            </div>
          </div>
        </section>

        <!-- Visibilidad -->
        <section class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" aria-labelledby="s-visib">
          <h2 id="s-visib" class="font-montserrat font-bold text-lg text-[#111827] mb-4">Visibilidad</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label class="flex items-start gap-3 rounded-xl border border-gray-200 p-3 cursor-pointer hover:bg-gray-50">
              <input type="checkbox" formControlName="is_published" class="mt-1 rounded border-gray-300 text-[#E60000] focus:ring-[#E60000]" />
              <span><span class="block font-semibold text-sm">Publicado</span><span class="block text-xs text-gray-500">Visible en la tienda. Desmárcalo para ocultarlo.</span></span>
            </label>
            <label class="flex items-start gap-3 rounded-xl border border-gray-200 p-3 cursor-pointer hover:bg-gray-50">
              <input type="checkbox" formControlName="is_featured" class="mt-1 rounded border-gray-300 text-[#E60000] focus:ring-[#E60000]" />
              <span><span class="block font-semibold text-sm">Destacado</span><span class="block text-xs text-gray-500">Aparece en la sección de destacados de la portada.</span></span>
            </label>
          </div>
        </section>

        <!-- Identificación e inventario -->
        <section class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" aria-labelledby="s-inv">
          <h2 id="s-inv" class="font-montserrat font-bold text-lg text-[#111827] mb-4">Identificación e inventario <span class="text-sm font-normal text-gray-400">(todo opcional)</span></h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="sku" class="etiqueta">SKU</label>
              <input id="sku" type="text" formControlName="sku" maxlength="64" class="campo" [class.campo-error]="invalido('sku')" />
              @if (invalido('sku')) { <p class="msg-error">{{ errorDe('sku') }}</p> }
            </div>
            <div>
              <label for="model" class="etiqueta">Modelo</label>
              <input id="model" type="text" formControlName="model" maxlength="80" class="campo" [class.campo-error]="invalido('model')" />
              @if (invalido('model')) { <p class="msg-error">{{ errorDe('model') }}</p> }
            </div>
            <div>
              <label for="availability" class="etiqueta">Disponibilidad</label>
              <select id="availability" formControlName="availability" class="campo bg-white">
                <option value="">No indicar</option>
                @for (d of disponibilidades; track d.valor) { <option [value]="d.valor">{{ d.texto }}</option> }
              </select>
            </div>
            <div>
              <label for="stock" class="etiqueta">Stock (unidades)</label>
              <input id="stock" type="number" formControlName="stock" min="0" step="1" inputmode="numeric" class="campo" [class.campo-error]="invalido('stock')" />
              @if (invalido('stock')) { <p class="msg-error">{{ errorDe('stock') }}</p> }
            </div>
            <div class="sm:col-span-2">
              <label for="warranty" class="etiqueta">Garantía</label>
              <input id="warranty" type="text" formControlName="warranty" maxlength="120" class="campo" [class.campo-error]="invalido('warranty')" />
              @if (invalido('warranty')) { <p class="msg-error">{{ errorDe('warranty') }}</p> }
            </div>
          </div>
        </section>

        <!-- Atributos técnicos -->
        <details class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 group" [open]="tieneAtributos()">
          <summary class="cursor-pointer font-montserrat font-bold text-lg text-[#111827] list-none flex items-center justify-between">
            <span>Atributos técnicos <span class="text-sm font-normal text-gray-400">(opcional)</span></span>
            <i class="fas fa-chevron-down text-sm text-gray-400 transition-transform group-open:rotate-180"></i>
          </summary>
          <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            @for (c of camposTexto; track c.clave) {
              <div>
                <label [for]="c.clave" class="etiqueta">{{ c.etiqueta }}</label>
                <input [id]="c.clave" type="text" [formControlName]="c.clave" [maxLength]="c.max" class="campo" [class.campo-error]="invalido(c.clave)" />
                @if (invalido(c.clave)) { <p class="msg-error">{{ errorDe(c.clave) }}</p> }
              </div>
            }
            @for (c of camposNumero; track c.clave) {
              <div>
                <label [for]="c.clave" class="etiqueta">{{ c.etiqueta }} ({{ c.unidad }})</label>
                <input [id]="c.clave" type="number" [formControlName]="c.clave" min="0" step="0.01" inputmode="decimal" class="campo" [class.campo-error]="invalido(c.clave)" />
                @if (invalido(c.clave)) { <p class="msg-error">{{ errorDe(c.clave) }}</p> }
              </div>
            }
          </div>
        </details>

        <!-- Especificaciones -->
        <section class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" aria-labelledby="s-esp">
          <div class="flex items-center justify-between mb-3">
            <h2 id="s-esp" class="font-montserrat font-bold text-lg text-[#111827]">Especificaciones <span class="text-sm font-normal text-gray-400">(opcional)</span></h2>
            <button type="button" (click)="agregarEspecificacion()" [disabled]="especificaciones.length >= 40"
                    class="text-sm text-[#E60000] font-medium hover:underline disabled:opacity-50">+ Añadir</button>
          </div>
          @if (especificaciones.length === 0) {
            <p class="text-sm text-gray-500">Sin especificaciones. Úsalas para datos como "Resolución: 4K" o "Eficiencia energética: A++".</p>
          }
          <div formArrayName="specifications" class="space-y-2">
            @for (g of especificaciones.controls; track g; let i = $index) {
              <div [formGroupName]="i" class="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_2fr_auto] gap-2 items-start">
                <div>
                  <input type="text" formControlName="label" maxlength="80" placeholder="Nombre" [attr.aria-label]="'Nombre de la especificación ' + (i + 1)"
                         class="campo" [class.campo-error]="g.get('label')?.invalid && (g.get('label')?.touched || enviado())" />
                </div>
                <div class="col-span-2 sm:col-span-1 sm:order-none order-last">
                  <input type="text" formControlName="value" maxlength="300" placeholder="Valor" [attr.aria-label]="'Valor de la especificación ' + (i + 1)"
                         class="campo" [class.campo-error]="g.get('value')?.invalid && (g.get('value')?.touched || enviado())" />
                </div>
                <button type="button" (click)="quitarEspecificacion(i)" [attr.aria-label]="'Quitar especificación ' + (i + 1)"
                        class="w-10 h-10 rounded-lg border border-gray-200 text-[#E60000] hover:bg-red-50"><i class="fas fa-trash"></i></button>
              </div>
            }
          </div>
          @if (especificacionesInvalidas()) { <p class="msg-error mt-2">Cada especificación necesita nombre y valor.</p> }
        </section>

        <!-- Imágenes -->
        <section class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" aria-labelledby="s-img">
          <h2 id="s-img" class="font-montserrat font-bold text-lg text-[#111827] mb-3">Imágenes</h2>
          @if (esNuevo) {
            <p class="text-sm text-gray-500 rounded-xl bg-gray-50 border border-dashed border-gray-300 p-4">
              <i class="fas fa-circle-info mr-1"></i> Guarda el producto primero; después podrás subir sus imágenes.
            </p>
          } @else if (productId) {
            <app-producto-imagenes [productId]="productId" [imagenes]="imagenes()" />
          }
        </section>

        <!-- Zona de peligro -->
        @if (!esNuevo) {
          <section class="bg-white rounded-2xl border border-red-100 p-5" aria-labelledby="s-peligro">
            <h2 id="s-peligro" class="font-montserrat font-bold text-lg text-[#E60000]">Eliminar producto</h2>
            <p class="text-sm text-gray-600 mt-1">
              Lo más seguro es <strong>ocultarlo</strong> (desmarca "Publicado"): deja de verse en la tienda y se puede recuperar.
              Eliminarlo es definitivo y borra también sus imágenes. Solo se pueden eliminar productos ocultos.
            </p>
            <button type="button" (click)="eliminar()" [disabled]="guardando() || eliminando() || !!producto()?.is_published"
                    class="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-300 text-[#E60000] px-4 py-2 text-sm font-semibold hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed">
              <i class="fas fa-trash"></i> {{ eliminando() ? 'Eliminando…' : 'Eliminar definitivamente' }}
            </button>
            @if (producto()?.is_published) { <p class="text-xs text-gray-500 mt-2">Oculta el producto y guarda los cambios para poder eliminarlo.</p> }
          </section>
        }

        <!-- Barra de acciones -->
        <div class="fixed bottom-0 inset-x-0 lg:left-64 z-30 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3">
          <div class="max-w-6xl mx-auto flex items-center justify-end gap-3">
            @if (errorGuardado()) { <p role="alert" class="mr-auto text-sm text-red-600 hidden sm:block">{{ errorGuardado() }}</p> }
            <a routerLink="/admin/productos" class="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50">Cancelar</a>
            <button type="submit" [disabled]="guardando() || eliminando()"
                    class="inline-flex items-center justify-center gap-2 min-w-36 px-5 py-2.5 rounded-lg bg-[#E60000] hover:bg-[#c40000] disabled:opacity-70 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors">
              @if (guardando()) { <i class="fas fa-spinner fa-spin"></i> Guardando… } @else { <i class="fas fa-floppy-disk"></i> {{ esNuevo ? 'Crear producto' : 'Guardar cambios' }} }
            </button>
          </div>
        </div>
      </form>
    }
  `,
  styles: [`
    :host { display: block; }
    .etiqueta { display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }
    .campo { width: 100%; border-radius: 0.5rem; border: 1px solid #d1d5db; padding: 0.55rem 0.75rem; font-size: 0.95rem; }
    .campo:focus { outline: none; box-shadow: 0 0 0 2px rgba(230, 0, 0, 0.25); border-color: #E60000; }
    .campo-error { border-color: #f87171; }
    .msg-error { font-size: 0.75rem; color: #dc2626; margin-top: 0.25rem; }
  `]
})
export class AdminProductoFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalogo = inject(AdminCatalogoService);
  private readonly ui = inject(AdminUiService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly disponibilidades = DISPONIBILIDADES;
  readonly camposTexto: CampoTexto[] = [
    { clave: 'color', etiqueta: 'Color', max: 60 },
    { clave: 'capacity', etiqueta: 'Capacidad', max: 60 },
    { clave: 'power', etiqueta: 'Potencia', max: 60 },
    { clave: 'voltage', etiqueta: 'Voltaje', max: 60 }
  ];
  readonly camposNumero: CampoNumero[] = [
    { clave: 'width_cm', etiqueta: 'Ancho', unidad: 'cm' },
    { clave: 'height_cm', etiqueta: 'Alto', unidad: 'cm' },
    { clave: 'depth_cm', etiqueta: 'Profundidad', unidad: 'cm' },
    { clave: 'weight_kg', etiqueta: 'Peso', unidad: 'kg' }
  ];

  readonly form = this.fb.group(
    {
      name: ['', [Validators.required, Validators.maxLength(200), noVacio]],
      slug: ['', [Validators.required, Validators.maxLength(120), Validators.pattern(SLUG_REGEX)]],
      brand_id: ['', Validators.required],
      category_id: ['', Validators.required],
      price: new FormControl<number | null>(null, [Validators.required, Validators.min(0), Validators.max(9999999.99)]),
      compare_at_price: new FormControl<number | null>(null, [Validators.min(0.01), Validators.max(9999999.99)]),
      badge: ['', Validators.maxLength(30)],
      short_description: ['', Validators.maxLength(300)],
      description: ['', Validators.maxLength(10000)],
      is_published: [true],
      is_featured: [false],
      sku: ['', Validators.maxLength(64)],
      model: ['', Validators.maxLength(80)],
      availability: [''],
      stock: new FormControl<number | null>(null, [Validators.min(0), Validators.max(1000000), Validators.pattern(/^\d+$/)]),
      warranty: ['', Validators.maxLength(120)],
      color: ['', Validators.maxLength(60)],
      capacity: ['', Validators.maxLength(60)],
      power: ['', Validators.maxLength(60)],
      voltage: ['', Validators.maxLength(60)],
      width_cm: new FormControl<number | null>(null, [Validators.min(0.01), Validators.max(999999)]),
      height_cm: new FormControl<number | null>(null, [Validators.min(0.01), Validators.max(999999)]),
      depth_cm: new FormControl<number | null>(null, [Validators.min(0.01), Validators.max(999999)]),
      weight_kg: new FormControl<number | null>(null, [Validators.min(0.01), Validators.max(999999)]),
      specifications: this.fb.array<FormGroup>([])
    },
    { validators: precioOriginalCoherente }
  );

  get especificaciones(): FormArray<FormGroup> {
    return this.form.controls['specifications'] as FormArray<FormGroup>;
  }

  productId: string | null = null;
  esNuevo = true;

  readonly cargando = signal(true);
  readonly errorCarga = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly eliminando = signal(false);
  readonly enviado = signal(false);
  readonly errorGuardado = signal<string | null>(null);
  readonly producto = signal<ProductoAdminRow | null>(null);
  readonly imagenes = signal<ImagenAdmin[]>([]);
  readonly categorias = signal<OpcionCatalogo[]>([]);
  readonly marcas = signal<OpcionCatalogo[]>([]);
  readonly estadoSlug = signal<EstadoSlug>('idle');
  readonly nuevaOpcion = signal<'marca' | 'categoría' | null>(null);
  readonly creandoOpcion = signal(false);
  readonly errorOpcion = signal<string | null>(null);

  private slugManual = false;
  private slugOriginal = '';
  private temporizadorSlug: ReturnType<typeof setTimeout> | null = null;
  private verificacion = 0;
  private destruido = false;

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    this.esNuevo = id === null;
    try {
      const [cats, marcas] = await Promise.all([this.catalogo.listarCategorias(), this.catalogo.listarMarcas()]);
      this.categorias.set(cats);
      this.marcas.set(marcas);

      if (id !== null) {
        if (!UUID.test(id)) throw new ErrorAdmin('El identificador del producto no es válido.');
        const p = await this.catalogo.obtenerProducto(id);
        if (!p) throw new ErrorAdmin('No se encontró el producto.');
        this.productId = p.id;
        this.aplicarProducto(p);
      }
    } catch (e) {
      this.errorCarga.set(e instanceof ErrorAdmin ? e.message : 'No se pudo cargar el producto.');
    } finally {
      if (!this.destruido) this.cargando.set(false);
    }
  }

  ngOnDestroy(): void {
    this.destruido = true;
    if (this.temporizadorSlug) clearTimeout(this.temporizadorSlug);
  }

  // ---------------- carga ----------------

  private aplicarProducto(p: ProductoAdminRow): void {
    this.producto.set(p);
    this.imagenes.set(p.images ?? []);
    this.slugOriginal = p.slug;
    this.slugManual = true;
    this.especificaciones.clear();
    for (const e of p.specifications ?? []) this.especificaciones.push(this.nuevaEspecificacion(e.label, e.value));
    this.form.patchValue({
      name: p.name, slug: p.slug, brand_id: p.brand_id, category_id: p.category_id,
      price: Number(p.price), compare_at_price: p.compare_at_price === null ? null : Number(p.compare_at_price),
      badge: p.badge ?? '', short_description: p.short_description ?? '', description: p.description ?? '',
      is_published: p.is_published, is_featured: p.is_featured,
      sku: p.sku ?? '', model: p.model ?? '', availability: p.availability ?? '', stock: p.stock, warranty: p.warranty ?? '',
      color: p.color ?? '', capacity: p.capacity ?? '', power: p.power ?? '', voltage: p.voltage ?? '',
      width_cm: p.width_cm === null ? null : Number(p.width_cm), height_cm: p.height_cm === null ? null : Number(p.height_cm),
      depth_cm: p.depth_cm === null ? null : Number(p.depth_cm), weight_kg: p.weight_kg === null ? null : Number(p.weight_kg)
    });
    this.form.markAsPristine();
  }

  // ---------------- slug ----------------

  alEscribirNombre(): void {
    if (!this.esNuevo || this.slugManual) return;
    this.form.controls['slug'].setValue(slugify(String(this.form.controls['name'].value ?? '')));
    this.programarVerificacionSlug();
  }

  alEscribirSlug(): void {
    this.slugManual = true;
    this.programarVerificacionSlug();
  }

  slugCambiado(): boolean {
    return this.form.controls['slug'].value !== this.slugOriginal;
  }

  private programarVerificacionSlug(): void {
    if (this.temporizadorSlug) clearTimeout(this.temporizadorSlug);
    const slug = String(this.form.controls['slug'].value ?? '');
    if (!slug || this.form.controls['slug'].invalid || (!this.esNuevo && slug === this.slugOriginal)) {
      this.estadoSlug.set('idle');
      return;
    }
    this.estadoSlug.set('verificando');
    this.temporizadorSlug = setTimeout(() => void this.verificarSlug(slug), 400);
  }

  private async verificarSlug(slug: string): Promise<boolean> {
    const mia = ++this.verificacion;
    try {
      const libre = await this.catalogo.slugDisponible(slug, this.productId ?? undefined);
      if (mia === this.verificacion && !this.destruido) this.estadoSlug.set(libre ? 'libre' : 'ocupado');
      return libre;
    } catch {
      if (mia === this.verificacion && !this.destruido) this.estadoSlug.set('idle'); // si no se puede comprobar, decide el guardado
      return true;
    }
  }

  // ---------------- especificaciones ----------------

  private nuevaEspecificacion(label = '', value = ''): FormGroup {
    return this.fb.group({
      label: [label, [Validators.required, Validators.maxLength(80), noVacio]],
      value: [value, [Validators.required, Validators.maxLength(300), noVacio]]
    });
  }

  agregarEspecificacion(): void {
    this.especificaciones.push(this.nuevaEspecificacion());
  }

  quitarEspecificacion(i: number): void {
    this.especificaciones.removeAt(i);
    this.form.markAsDirty();
  }

  especificacionesInvalidas(): boolean {
    return this.especificaciones.invalid && (this.enviado() || this.especificaciones.controls.some(g => g.touched));
  }

  tieneAtributos(): boolean {
    const v = this.form.getRawValue() as Record<string, unknown>;
    return [...this.camposTexto, ...this.camposNumero].some(c => v[c.clave] !== '' && v[c.clave] !== null);
  }

  // ---------------- marcas y categorías ----------------

  abrirNuevaOpcion(tipo: 'marca' | 'categoría' | 'categoria'): void {
    this.errorOpcion.set(null);
    this.nuevaOpcion.set(tipo === 'marca' ? 'marca' : 'categoría');
    queueMicrotask(() => this.host.nativeElement.querySelector<HTMLInputElement>('#nueva-opcion')?.focus());
  }

  async crearOpcion(tipo: 'marca' | 'categoría', nombre: string): Promise<void> {
    if (this.creandoOpcion()) return;
    this.creandoOpcion.set(true);
    this.errorOpcion.set(null);
    try {
      if (tipo === 'marca') {
        const m = await this.catalogo.crearMarca(nombre);
        this.marcas.update(l => [...l, m].sort((a, b) => a.name.localeCompare(b.name, 'es')));
        this.form.controls['brand_id'].setValue(m.id);
      } else {
        const c = await this.catalogo.crearCategoria(nombre);
        this.categorias.update(l => [...l, c].sort((a, b) => a.name.localeCompare(b.name, 'es')));
        this.form.controls['category_id'].setValue(c.id);
      }
      this.nuevaOpcion.set(null);
      this.ui.ok(`${tipo === 'marca' ? 'Marca' : 'Categoría'} creada y seleccionada.`);
    } catch (e) {
      this.errorOpcion.set(e instanceof ErrorAdmin ? e.message : 'No se pudo crear.');
    } finally {
      this.creandoOpcion.set(false);
    }
  }

  // ---------------- validación en pantalla ----------------

  invalido(clave: string): boolean {
    const c = this.form.get(clave);
    return !!c && c.invalid && (c.touched || c.dirty || this.enviado());
  }

  errorDe(clave: string): string {
    const e = this.form.get(clave)?.errors;
    if (!e) return '';
    if (e['required'] || e['vacio']) return 'Este campo es obligatorio.';
    if (e['maxlength']) return `Máximo ${e['maxlength'].requiredLength} caracteres.`;
    if (e['pattern']) {
      if (clave === 'slug') return 'Usa solo minúsculas, números y guiones (ej. smart-tv-samsung-55).';
      if (clave === 'stock') return 'Debe ser un número entero.';
      return 'Formato no válido.';
    }
    if (e['min']) return clave === 'price' || clave === 'stock' ? 'No puede ser negativo.' : 'Debe ser mayor que 0.';
    if (e['max']) return 'El valor es demasiado grande.';
    return 'Valor no válido.';
  }

  // ---------------- guardar ----------------

  private construirPayload(): ProductoPayload {
    const v = this.form.getRawValue() as Record<string, any>;
    const txt = (x: unknown): string | null => (typeof x === 'string' && x.trim() !== '' ? x.trim() : null);
    const num = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);
    return {
      slug: String(v['slug']).trim(),
      name: String(v['name']).trim(),
      brand_id: v['brand_id'],
      category_id: v['category_id'],
      model: txt(v['model']),
      sku: txt(v['sku']),
      short_description: txt(v['short_description']),
      description: txt(v['description']),
      price: Math.round(Number(v['price']) * 100) / 100,
      compare_at_price: num(v['compare_at_price']) === null ? null : Math.round(Number(v['compare_at_price']) * 100) / 100,
      badge: txt(v['badge']),
      is_featured: !!v['is_featured'],
      is_published: !!v['is_published'],
      availability: (txt(v['availability']) as ProductoPayload['availability']),
      stock: num(v['stock']),
      color: txt(v['color']),
      capacity: txt(v['capacity']),
      power: txt(v['power']),
      voltage: txt(v['voltage']),
      width_cm: num(v['width_cm']),
      height_cm: num(v['height_cm']),
      depth_cm: num(v['depth_cm']),
      weight_kg: num(v['weight_kg']),
      warranty: txt(v['warranty']),
      specifications: (v['specifications'] as { label: string; value: string }[]).map(e => ({ label: e.label.trim(), value: e.value.trim() }))
    };
  }

  async guardar(): Promise<void> {
    if (this.guardando() || this.eliminando()) return; // evita el doble envío
    this.enviado.set(true);
    this.errorGuardado.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.errorGuardado.set('Revisa los campos marcados en rojo.');
      this.ui.error('Revisa los campos marcados en rojo.');
      queueMicrotask(() => this.host.nativeElement.querySelector<HTMLElement>('.campo-error')?.focus());
      return;
    }

    this.guardando.set(true);
    try {
      const payload = this.construirPayload();
      if ((this.esNuevo || payload.slug !== this.slugOriginal) && !(await this.verificarSlug(payload.slug))) {
        this.form.controls['slug'].markAsTouched();
        this.errorGuardado.set('Ese slug ya está en uso. Elige otro.');
        this.ui.error('Ese slug ya está en uso. Elige otro.');
        return;
      }
      if (this.esNuevo) {
        const id = await this.catalogo.crearProducto(payload);
        this.ui.ok('Producto creado. Ahora puedes añadir sus imágenes.');
        this.form.markAsPristine();
        await this.router.navigate(['/admin/productos', id, 'editar']);
      } else {
        await this.catalogo.actualizarProducto(this.productId!, payload);
        const fresco = await this.catalogo.obtenerProducto(this.productId!);
        if (fresco) this.aplicarProducto(fresco);
        this.enviado.set(false);
        this.estadoSlug.set('idle');
        this.ui.ok('Cambios guardados.');
      }
    } catch (e) {
      const msg = e instanceof ErrorAdmin ? e.message : 'No se pudo guardar. Inténtalo de nuevo.';
      if (e instanceof ErrorAdmin && e.campo === 'slug') this.estadoSlug.set('ocupado');
      this.errorGuardado.set(msg);
      this.ui.error(msg);
    } finally {
      this.guardando.set(false);
    }
  }

  async eliminar(): Promise<void> {
    const p = this.producto();
    if (!p || this.eliminando() || this.guardando()) return;
    if (p.is_published) { this.ui.error('Oculta el producto antes de eliminarlo.'); return; }
    const ok = await this.ui.confirmar({
      titulo: 'Eliminar producto',
      mensaje: `Se eliminará "${p.name}" y todas sus imágenes. Esta acción es definitiva.`,
      confirmar: 'Eliminar definitivamente',
      escribir: p.slug,
      peligro: true
    });
    if (!ok) return;
    this.eliminando.set(true);
    try {
      await this.catalogo.eliminarProducto(p.id);
      this.ui.ok('Producto eliminado.');
      await this.router.navigate(['/admin/productos']);
    } catch (e) {
      this.ui.error(e instanceof ErrorAdmin ? e.message : 'No se pudo eliminar el producto.');
    } finally {
      this.eliminando.set(false);
    }
  }
}
