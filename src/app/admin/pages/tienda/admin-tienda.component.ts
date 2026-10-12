import { ChangeDetectionStrategy, Component, OnInit, WritableSignal, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { AdminTiendaService } from '../../data/admin-tienda.service';
import { ErrorAdmin } from '../../data/admin-catalogo.service';
import { AdminUiService } from '../../core/admin-ui.service';
import {
  AjustesTienda,
  DIAS_SEMANA,
  SucursalAdmin,
  SucursalPayload,
  WHATSAPP_VALIDO,
  normalizarWhatsapp,
  textoHorario
} from '../../data/tienda.models';

const noVacio: ValidatorFn = c => (typeof c.value === 'string' && c.value.length > 0 && c.value.trim() === '' ? { vacio: true } : null);
const whatsappOk: ValidatorFn = c => {
  const v = typeof c.value === 'string' ? c.value.trim() : '';
  return v === '' || WHATSAPP_VALIDO.test(normalizarWhatsapp(v)) ? null : { whatsapp: true };
};
const urlHttps: ValidatorFn = c => {
  const v = typeof c.value === 'string' ? c.value.trim() : '';
  return v === '' || /^https:\/\/[^\s]+$/.test(v) ? null : { url: true };
};
/** Texto de búsqueda para el mapa: nunca una URL (la URL la construye el servicio de mapas). */
const sinUrl: ValidatorFn = c => {
  const v = typeof c.value === 'string' ? c.value.trim() : '';
  return v === '' || !(/^[a-z][a-z0-9+.-]*:/i.test(v) || v.includes('://') || v.startsWith('//')) ? null : { url: true };
};
const horarioCoherente: ValidatorFn = (g: AbstractControl): ValidationErrors | null => {
  const dias = g.get('dias')?.value as Record<string, boolean>;
  const hay = Object.values(dias ?? {}).some(Boolean);
  const abre = g.get('opens_at')?.value as string;
  const cierra = g.get('closes_at')?.value as string;
  const errores: ValidationErrors = {};
  if (!hay) errores['sinDias'] = true;
  if (abre && cierra && abre >= cierra) errores['horas'] = true;
  return Object.keys(errores).length ? errores : null;
};
/** Si hay WhatsApp de asesor, el nombre es obligatorio (y al revés). */
const asesorCompleto: ValidatorFn = (g: AbstractControl): ValidationErrors | null => {
  const n = (g.get('asesor_name')?.value as string)?.trim();
  const w = (g.get('asesor_whatsapp')?.value as string)?.trim();
  if ((n && !w) || (!n && w)) return { asesorIncompleto: true };
  return null;
};

interface TarjetaSucursal {
  datos: SucursalAdmin;
  form: FormGroup;
  guardando: WritableSignal<boolean>;
  enviado: WritableSignal<boolean>;
  /** Vista previa de la foto del asesor (URL pública o local) */
  foto: WritableSignal<string | null>;
  errorFoto: WritableSignal<string | null>;
  archivoFoto: File | null;
  quitarFoto: boolean;
  urlLocal: string | null;
}

@Component({
  selector: 'app-admin-tienda',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <header class="mb-6">
      <h1 class="font-montserrat font-extrabold text-2xl text-[#111827]">Tienda</h1>
      <p class="text-sm text-gray-500 mt-1">Datos de contacto, redes sociales, sucursales y asesores que se muestran en la web.</p>
    </header>

    @if (cargando()) {
      <div class="space-y-4" aria-busy="true"><div class="h-48 rounded-2xl bg-gray-200 animate-pulse"></div><div class="h-72 rounded-2xl bg-gray-200 animate-pulse"></div></div>
    } @else if (errorCarga(); as e) {
      <div role="alert" class="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {{ e }} <button type="button" (click)="cargar()" class="ml-2 underline font-semibold">Reintentar</button>
      </div>
    } @else {

      <!-- ============ Datos generales ============ -->
      <section class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6" aria-labelledby="t-general">
        <h2 id="t-general" class="font-montserrat font-bold text-lg text-[#111827]">Datos generales y redes sociales</h2>
        @if (!ajustes()) {
          <p class="mt-3 text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
            Aún no existen los datos iniciales de la tienda en la base de datos. Avisa a quien administra el sitio.
          </p>
        } @else {
          <form [formGroup]="formAjustes" (ngSubmit)="guardarAjustes()" novalidate class="mt-4 grid sm:grid-cols-2 gap-4">
            <div>
              <label for="g-nombre" class="etiqueta">Nombre de la tienda <span class="text-[#E60000]">*</span></label>
              <input id="g-nombre" type="text" formControlName="store_name" maxlength="120" class="campo"
                     [class.campo-error]="invalido(formAjustes, 'store_name', enviadoAjustes())" />
              @if (invalido(formAjustes, 'store_name', enviadoAjustes())) { <p class="msg-error">Escribe el nombre de la tienda.</p> }
            </div>
            <div>
              <label for="g-wa" class="etiqueta">WhatsApp principal <span class="text-[#E60000]">*</span></label>
              <input id="g-wa" type="tel" inputmode="numeric" formControlName="main_whatsapp" maxlength="24" class="campo"
                     placeholder="0986 952 147" [class.campo-error]="invalido(formAjustes, 'main_whatsapp', enviadoAjustes())" />
              <p class="text-xs text-gray-400 mt-1">Se usa en el botón flotante y el menú. Puedes escribirlo con espacios o con 0 inicial.</p>
              @if (invalido(formAjustes, 'main_whatsapp', enviadoAjustes())) { <p class="msg-error">Escribe un número válido (8 a 15 dígitos).</p> }
            </div>
            @for (r of redes; track r.clave) {
              <div>
                <label [for]="'g-' + r.clave" class="etiqueta">{{ r.etiqueta }} <span class="text-gray-400 font-normal">(opcional)</span></label>
                <input [id]="'g-' + r.clave" type="url" [formControlName]="r.clave" maxlength="300" class="campo"
                       [placeholder]="r.ejemplo" [class.campo-error]="invalido(formAjustes, r.clave, enviadoAjustes())" />
                @if (invalido(formAjustes, r.clave, enviadoAjustes())) { <p class="msg-error">El enlace debe empezar con https://</p> }
              </div>
            }
            <p class="sm:col-span-2 text-xs text-gray-500">Si dejas una red vacía, su icono no se muestra en la tienda.</p>
            <div class="sm:col-span-2 flex justify-end">
              <button type="submit" [disabled]="guardandoAjustes()" class="btn-guardar">
                @if (guardandoAjustes()) { <i class="fas fa-spinner fa-spin"></i> Guardando… } @else { <i class="fas fa-floppy-disk"></i> Guardar datos generales }
              </button>
            </div>
          </form>
        }
      </section>

      <!-- ============ Sucursales ============ -->
      <h2 class="font-montserrat font-bold text-lg text-[#111827] mb-3">Sucursales y asesores</h2>
      @if (tarjetas().length === 0) {
        <p class="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
          Aún no hay sucursales en la base de datos. Mientras tanto, la tienda usa los datos de respaldo. Avisa a quien administra el sitio.
        </p>
      }
      <div class="space-y-6">
        @for (t of tarjetas(); track t.datos.id) {
          <section class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" [attr.aria-label]="'Sucursal ' + t.datos.name">
            <form [formGroup]="t.form" (ngSubmit)="guardarSucursal(t)" novalidate>
              <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 class="font-montserrat font-bold text-[#111827]">{{ t.datos.name }}</h3>
                <label class="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" formControlName="is_active" class="w-4 h-4 accent-[#E60000]" />
                  Visible en la tienda
                </label>
              </div>

              <div class="grid sm:grid-cols-2 gap-4">
                <div>
                  <label class="etiqueta">Nombre de la sucursal <span class="text-[#E60000]">*</span></label>
                  <input type="text" formControlName="name" maxlength="120" class="campo" [class.campo-error]="invalido(t.form, 'name', t.enviado())" />
                  @if (invalido(t.form, 'name', t.enviado())) { <p class="msg-error">Escribe el nombre.</p> }
                </div>
                <div>
                  <label class="etiqueta">Zona <span class="text-gray-400 font-normal">(ej. Sucursal Norte)</span></label>
                  <input type="text" formControlName="zone" maxlength="80" class="campo" />
                </div>
                <div>
                  <label class="etiqueta">Nombre corto <span class="text-gray-400 font-normal">(ej. Norte)</span></label>
                  <input type="text" formControlName="short_name" maxlength="40" class="campo" />
                </div>
                <div>
                  <label class="etiqueta">Teléfono visible</label>
                  <input type="text" formControlName="phone_display" maxlength="40" class="campo" placeholder="0986 952 147" />
                </div>
                <div class="sm:col-span-2">
                  <label class="etiqueta">Dirección <span class="text-[#E60000]">*</span></label>
                  <input type="text" formControlName="address" maxlength="200" class="campo" [class.campo-error]="invalido(t.form, 'address', t.enviado())" />
                  @if (invalido(t.form, 'address', t.enviado())) { <p class="msg-error">Escribe la dirección.</p> }
                </div>
                <div class="sm:col-span-2">
                  <label class="etiqueta">Texto para ubicar en el mapa <span class="text-gray-400 font-normal">(opcional; si lo dejas vacío se usa la dirección)</span></label>
                  <input type="text" formControlName="map_query" maxlength="200" class="campo" [class.campo-error]="invalido(t.form, 'map_query', t.enviado())" />
                  @if (invalido(t.form, 'map_query', t.enviado())) { <p class="msg-error">Escribe una dirección o lugar, no un enlace.</p> }
                </div>
              </div>

              <fieldset class="mt-5">
                <legend class="etiqueta">Días de atención <span class="text-[#E60000]">*</span></legend>
                <div class="flex flex-wrap gap-2" formGroupName="dias">
                  @for (d of dias; track d.clave) {
                    <label class="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" [formControlName]="d.clave" class="w-4 h-4 accent-[#E60000]" /> {{ d.largo }}
                    </label>
                  }
                </div>
                <div class="grid grid-cols-2 sm:max-w-sm gap-4 mt-3">
                  <div>
                    <label class="etiqueta">Abre</label>
                    <input type="time" formControlName="opens_at" class="campo" />
                  </div>
                  <div>
                    <label class="etiqueta">Cierra</label>
                    <input type="time" formControlName="closes_at" class="campo" />
                  </div>
                </div>
                @if (t.enviado() && t.form.errors?.['sinDias']) { <p class="msg-error">Elige al menos un día.</p> }
                @if (t.form.errors?.['horas']) { <p class="msg-error">La hora de cierre debe ser posterior a la de apertura.</p> }
                @if (vistaHorario(t); as h) {
                  <p class="mt-3 text-sm text-gray-600"><i class="far fa-clock text-[#E60000] mr-1"></i> En la tienda se verá: <strong>{{ h }}</strong></p>
                }
              </fieldset>

              <fieldset class="mt-5 rounded-xl bg-gray-50 p-4">
                <legend class="etiqueta px-1">Asesor de WhatsApp de esta sucursal</legend>
                <div class="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label class="etiqueta">Nombre</label>
                    <input type="text" formControlName="asesor_name" maxlength="80" class="campo" placeholder="Elizabeth" />
                  </div>
                  <div>
                    <label class="etiqueta">Cargo <span class="text-gray-400 font-normal">(Asesora / Asesor)</span></label>
                    <input type="text" formControlName="asesor_title" maxlength="40" class="campo" placeholder="Asesora" />
                  </div>
                  <div>
                    <label class="etiqueta">WhatsApp</label>
                    <input type="tel" inputmode="numeric" formControlName="asesor_whatsapp" maxlength="24" class="campo" placeholder="0986 952 147"
                           [class.campo-error]="invalido(t.form, 'asesor_whatsapp', t.enviado())" />
                  </div>
                </div>
                <div class="mt-4 flex flex-wrap items-center gap-4">
                  <span class="w-20 h-20 rounded-full bg-gray-200 border border-gray-300 overflow-hidden flex items-center justify-center text-gray-400 shrink-0">
                    @if (t.foto(); as src) { <img [src]="src" alt="Foto del asesor" class="w-full h-full object-cover" /> } @else { <i class="fas fa-user text-2xl"></i> }
                  </span>
                  <div class="min-w-0 flex-1 basis-56">
                    <label class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
                      <i class="fas fa-camera"></i> {{ t.foto() ? 'Cambiar foto' : 'Subir foto' }}
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" class="sr-only" (change)="elegirFoto(t, $event)" />
                    </label>
                    @if (t.foto()) { <button type="button" (click)="quitarFoto(t)" class="ml-2 text-sm text-gray-500 hover:text-[#E60000] underline">Quitar</button> }
                    @if (t.errorFoto(); as e) { <p class="msg-error">{{ e }}</p> }
                    <p class="text-xs text-gray-500 mt-1">
                      <strong>Qué cambia:</strong> la foto del asesor en la portada ("¿Necesitas ayuda para elegir?"). Mejor una foto de frente, con el rostro centrado,
                      casi cuadrada. Si no subes una, se muestra una foto de ejemplo. JPG, PNG o WebP, hasta 5 MB.
                    </p>
                  </div>
                </div>
                @if (invalido(t.form, 'asesor_whatsapp', t.enviado())) { <p class="msg-error">Escribe un número válido (8 a 15 dígitos).</p> }
                @if (t.enviado() && t.form.errors?.['asesorIncompleto']) { <p class="msg-error">Completa nombre y WhatsApp del asesor (o deja ambos vacíos).</p> }
                <p class="text-xs text-gray-500 mt-2">
                  Los botones "Consultar por WhatsApp" de esta sucursal abren este número.
                  @if (!t.datos.asesor) { Si no hay asesor, se usa el WhatsApp principal. }
                </p>
              </fieldset>

              <div class="mt-5 flex items-center justify-end gap-3">
                @if (t.enviado() && t.form.invalid) { <p role="alert" class="mr-auto text-sm text-red-600">Revisa los campos marcados.</p> }
                <button type="submit" [disabled]="t.guardando()" class="btn-guardar">
                  @if (t.guardando()) { <i class="fas fa-spinner fa-spin"></i> Guardando… } @else { <i class="fas fa-floppy-disk"></i> Guardar sucursal }
                </button>
              </div>
            </form>
          </section>
        }
      </div>

      <p class="mt-6 text-xs text-gray-500">
        Los cambios se guardan al instante; en la tienda pública pueden tardar unos minutos en verse.
        Para agregar o quitar una sucursal, avisa a quien administra el sitio.
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
    .btn-guardar { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.625rem 1.25rem;
      border-radius: 0.5rem; background: #E60000; color: #fff; font-size: 0.875rem; font-weight: 600; transition: background-color .15s; }
    .btn-guardar:hover { background: #c40000; }
    .btn-guardar:disabled { opacity: .7; cursor: not-allowed; }
  `]
})
export class AdminTiendaComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly tienda = inject(AdminTiendaService);
  private readonly ui = inject(AdminUiService);

  readonly dias = DIAS_SEMANA;
  readonly redes = [
    { clave: 'facebook_url', etiqueta: 'Facebook', ejemplo: 'https://www.facebook.com/tu-pagina' },
    { clave: 'instagram_url', etiqueta: 'Instagram', ejemplo: 'https://www.instagram.com/tu-usuario' },
    { clave: 'tiktok_url', etiqueta: 'TikTok', ejemplo: 'https://www.tiktok.com/@tu-usuario' }
  ];

  readonly cargando = signal(true);
  readonly errorCarga = signal<string | null>(null);
  readonly ajustes = signal<AjustesTienda | null>(null);
  readonly tarjetas = signal<TarjetaSucursal[]>([]);
  readonly guardandoAjustes = signal(false);
  readonly enviadoAjustes = signal(false);

  readonly formAjustes = this.fb.group({
    store_name: ['', [Validators.required, Validators.maxLength(120), noVacio]],
    main_whatsapp: ['', [Validators.required, whatsappOk]],
    facebook_url: ['', [Validators.maxLength(300), urlHttps]],
    instagram_url: ['', [Validators.maxLength(300), urlHttps]],
    tiktok_url: ['', [Validators.maxLength(300), urlHttps]]
  });

  ngOnInit(): void {
    void this.cargar();
  }

  invalido(form: FormGroup, campo: string, enviado: boolean): boolean {
    const c = form.get(campo);
    return !!c && c.invalid && (c.touched || enviado);
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.errorCarga.set(null);
    try {
      const [aj, sucursales] = await Promise.all([this.tienda.obtenerAjustes(), this.tienda.listarSucursales()]);
      this.ajustes.set(aj);
      if (aj) {
        this.formAjustes.reset({
          store_name: aj.store_name,
          main_whatsapp: aj.main_whatsapp ?? '',
          facebook_url: aj.facebook_url ?? '',
          instagram_url: aj.instagram_url ?? '',
          tiktok_url: aj.tiktok_url ?? ''
        });
      }
      this.tarjetas.set(sucursales.map(s => this.crearTarjeta(s)));
    } catch (e) {
      this.errorCarga.set(e instanceof ErrorAdmin ? e.message : 'No se pudieron cargar los datos.');
    } finally {
      this.cargando.set(false);
    }
  }

  private crearTarjeta(s: SucursalAdmin): TarjetaSucursal {
    const dias: Record<string, boolean> = {};
    for (const d of DIAS_SEMANA) dias[d.clave] = !!s.open_days?.includes(d.clave);
    const form = this.fb.group(
      {
        name: [s.name, [Validators.required, Validators.maxLength(120), noVacio]],
        zone: [s.zone ?? '', Validators.maxLength(80)],
        short_name: [s.short_name ?? '', Validators.maxLength(40)],
        address: [s.address, [Validators.required, Validators.maxLength(200), noVacio]],
        phone_display: [s.phone_display ?? '', Validators.maxLength(40)],
        map_query: [s.map_query ?? '', [Validators.maxLength(200), sinUrl]],
        is_active: [s.is_active],
        dias: this.fb.group(dias),
        opens_at: [s.opens_at ?? '', Validators.required],
        closes_at: [s.closes_at ?? '', Validators.required],
        asesor_name: [s.asesor?.name ?? '', Validators.maxLength(80)],
        asesor_title: [s.asesor?.title ?? '', Validators.maxLength(40)],
        asesor_whatsapp: [s.asesor?.whatsapp ?? '', whatsappOk]
      },
      { validators: [horarioCoherente, asesorCompleto] }
    );
    return {
      datos: s,
      form,
      guardando: signal(false),
      enviado: signal(false),
      foto: signal(this.tienda.urlFoto(s.asesor?.photo_path ?? null)),
      errorFoto: signal<string | null>(null),
      archivoFoto: null,
      quitarFoto: false,
      urlLocal: null
    };
  }

  /** Vista previa del texto de horario que verá el público. */
  vistaHorario(t: TarjetaSucursal): string {
    const v = t.form.getRawValue();
    if (!v.opens_at || !v.closes_at || v.opens_at >= v.closes_at) return '';
    return textoHorario(this.diasElegidos(v.dias), v.opens_at, v.closes_at);
  }

  private diasElegidos(mapa: Record<string, boolean>): string[] {
    return DIAS_SEMANA.map(d => d.clave).filter(c => mapa[c]);
  }

  elegirFoto(t: TarjetaSucursal, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    input.value = '';
    if (!archivo) return;
    const problema = this.tienda.validarFoto(archivo);
    if (problema) {
      t.errorFoto.set(problema);
      return;
    }
    t.errorFoto.set(null);
    if (t.urlLocal) URL.revokeObjectURL(t.urlLocal);
    t.urlLocal = URL.createObjectURL(archivo);
    t.archivoFoto = archivo;
    t.quitarFoto = false;
    t.foto.set(t.urlLocal);
  }

  quitarFoto(t: TarjetaSucursal): void {
    if (t.urlLocal) URL.revokeObjectURL(t.urlLocal);
    t.urlLocal = null;
    t.archivoFoto = null;
    t.quitarFoto = true;
    t.foto.set(null);
  }

  async guardarAjustes(): Promise<void> {
    this.enviadoAjustes.set(true);
    if (this.formAjustes.invalid) {
      this.formAjustes.markAllAsTouched();
      return;
    }
    const v = this.formAjustes.getRawValue();
    const vacioANull = (x: string | null) => (x && x.trim() ? x.trim() : null);
    this.guardandoAjustes.set(true);
    try {
      await this.tienda.guardarAjustes({
        store_name: (v.store_name ?? '').trim(),
        main_whatsapp: normalizarWhatsapp(v.main_whatsapp ?? ''),
        facebook_url: vacioANull(v.facebook_url),
        instagram_url: vacioANull(v.instagram_url),
        tiktok_url: vacioANull(v.tiktok_url)
      });
      this.formAjustes.patchValue({ main_whatsapp: normalizarWhatsapp(v.main_whatsapp ?? '') });
      this.ui.ok('Datos generales guardados.');
    } catch (e) {
      this.ui.error(e instanceof ErrorAdmin ? e.message : 'No se pudo guardar.');
    } finally {
      this.guardandoAjustes.set(false);
    }
  }

  async guardarSucursal(t: TarjetaSucursal): Promise<void> {
    t.enviado.set(true);
    if (t.form.invalid) {
      t.form.markAllAsTouched();
      return;
    }
    const v = t.form.getRawValue();
    const vacioANull = (x: string | null) => (x && x.trim() ? x.trim() : null);
    const abre: string = v.opens_at;
    const cierra: string = v.closes_at;
    const dias = this.diasElegidos(v.dias);
    const nombreAsesor = (v.asesor_name as string).trim();
    const payload: SucursalPayload = {
      name: (v.name as string).trim(),
      zone: vacioANull(v.zone),
      short_name: vacioANull(v.short_name),
      address: (v.address as string).trim(),
      phone_display: vacioANull(v.phone_display),
      map_query: vacioANull(v.map_query),
      open_days: dias,
      opens_at: abre,
      closes_at: cierra,
      opening_hours: textoHorario(dias, abre, cierra),
      is_active: !!v.is_active,
      asesor: nombreAsesor
        ? { name: nombreAsesor, title: vacioANull(v.asesor_title), whatsapp: normalizarWhatsapp(v.asesor_whatsapp as string) }
        : null
    };
    t.guardando.set(true);
    try {
      await this.tienda.guardarSucursal(t.datos, payload, { archivo: t.archivoFoto, quitar: t.quitarFoto });
      this.ui.ok(`Sucursal "${payload.name}" guardada.`);
      await this.refrescarTarjeta(t.datos.id);
    } catch (e) {
      this.ui.error(e instanceof ErrorAdmin ? e.message : 'No se pudo guardar la sucursal.');
    } finally {
      t.guardando.set(false);
    }
  }

  /** Refresca solo la tarjeta guardada (ids de asesor nuevos) sin tocar ediciones pendientes de otras. */
  private async refrescarTarjeta(id: string): Promise<void> {
    try {
      const fresca = (await this.tienda.listarSucursales()).find(s => s.id === id);
      if (!fresca) return;
      this.tarjetas.update(ts => ts.map(x => (x.datos.id === id ? this.crearTarjeta(fresca) : x)));
    } catch {
      /* el guardado ya fue exitoso; la lista se refrescará al recargar la página */
    }
  }
}
