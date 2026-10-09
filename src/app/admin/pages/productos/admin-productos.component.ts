import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminCatalogoService, ErrorAdmin } from '../../data/admin-catalogo.service';
import { AdminUiService } from '../../core/admin-ui.service';
import { EstadoFiltro, OpcionCatalogo, ProductoAdminRow } from '../../data/admin.models';
import { ImagenNoDisponibleComponent } from '../../../components/imagen-no-disponible/imagen-no-disponible.component';
import { formatoPrecio } from '../../../core/models/producto.helpers';

const POR_PAGINA = 20;

@Component({
  selector: 'app-admin-productos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ImagenNoDisponibleComponent],
  template: `
    <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 class="font-montserrat font-extrabold text-2xl text-[#111827]">Productos</h1>
        <p class="text-sm text-gray-500">{{ total() }} {{ total() === 1 ? 'producto' : 'productos' }}{{ hayFiltros() ? ' con los filtros actuales' : '' }}</p>
      </div>
      <a routerLink="/admin/productos/nuevo"
         class="inline-flex items-center justify-center gap-2 bg-[#E60000] hover:bg-[#c40000] text-white font-semibold rounded-lg px-4 py-2.5 transition-colors">
        <i class="fas fa-plus"></i> Nuevo producto
      </a>
    </header>

    <!-- Filtros -->
    <section class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4" aria-label="Filtros">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
        <div class="lg:col-span-4">
          <label for="f-q" class="sr-only">Buscar</label>
          <div class="relative">
            <i class="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input id="f-q" type="search" [value]="q()" (input)="cambiarBusqueda($any($event.target).value)"
                   placeholder="Buscar por nombre, slug, SKU o modelo"
                   class="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E60000]/40" />
          </div>
        </div>
        <div class="lg:col-span-2">
          <label for="f-cat" class="sr-only">Categoría</label>
          <select id="f-cat" [value]="categoriaId()" (change)="cambiarFiltro('categoria', $any($event.target).value)"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E60000]/40">
            <option value="">Todas las categorías</option>
            @for (c of categorias(); track c.id) { <option [value]="c.id" [selected]="c.id === categoriaId()">{{ c.name }}</option> }
          </select>
        </div>
        <div class="lg:col-span-2">
          <label for="f-marca" class="sr-only">Marca</label>
          <select id="f-marca" [value]="marcaId()" (change)="cambiarFiltro('marca', $any($event.target).value)"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E60000]/40">
            <option value="">Todas las marcas</option>
            @for (m of marcas(); track m.id) { <option [value]="m.id" [selected]="m.id === marcaId()">{{ m.name }}</option> }
          </select>
        </div>
        <div class="lg:col-span-2">
          <label for="f-estado" class="sr-only">Estado</label>
          <select id="f-estado" [value]="estado()" (change)="cambiarFiltro('estado', $any($event.target).value)"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E60000]/40">
            <option value="todos" [selected]="estado() === 'todos'">Publicados y ocultos</option>
            <option value="publicados" [selected]="estado() === 'publicados'">Solo publicados</option>
            <option value="ocultos" [selected]="estado() === 'ocultos'">Solo ocultos</option>
          </select>
        </div>
        <div class="lg:col-span-2 flex items-center justify-between gap-3">
          <label class="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" [checked]="soloDestacados()" (change)="cambiarFiltro('destacado', $any($event.target).checked ? '1' : '')"
                   class="rounded border-gray-300 text-[#E60000] focus:ring-[#E60000]" />
            Destacados
          </label>
          @if (hayFiltros()) {
            <button type="button" (click)="limpiar()" class="text-sm text-[#E60000] font-medium hover:underline">Limpiar</button>
          }
        </div>
      </div>
    </section>

    @if (error()) {
      <div role="alert" class="mb-4 flex items-center justify-between gap-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">
        <span><i class="fas fa-circle-exclamation mr-2"></i>{{ error() }}</span>
        <button type="button" (click)="cargar()" class="font-semibold underline">Reintentar</button>
      </div>
    }

    <!-- Tabla (≥ xl: con la barra lateral necesita ~940 px de ancho útil) -->
    <div class="hidden xl:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto" [class.opacity-60]="cargando() && filas().length > 0">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th scope="col" class="px-4 py-3 w-16">Imagen</th>
            <th scope="col" class="px-4 py-3">Producto</th>
            <th scope="col" class="px-4 py-3">Marca / Categoría</th>
            <th scope="col" class="px-4 py-3 text-right">Precio</th>
            <th scope="col" class="px-4 py-3 text-center">Estado</th>
            <th scope="col" class="px-4 py-3 text-center">Dest.</th>
            <th scope="col" class="px-4 py-3 text-right"><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          @for (p of filas(); track p.id) {
            <tr class="hover:bg-gray-50/60">
              <td class="px-4 py-3">
                <div class="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
                  @if (imagen(p); as src) {
                    @if (fallidas().has(src)) { <app-imagen-no-disponible /> }
                    @else { <img [src]="src" alt="" class="w-full h-full object-cover" loading="lazy" (error)="marcarFallida(src)" /> }
                  } @else { <app-imagen-no-disponible /> }
                </div>
              </td>
              <td class="px-4 py-3 max-w-xs">
                <a [routerLink]="['/admin/productos', p.id, 'editar']" class="font-semibold text-[#111827] hover:text-[#E60000] line-clamp-2">{{ p.name }}</a>
                <span class="block text-xs text-gray-400 truncate">{{ p.slug }}</span>
              </td>
              <td class="px-4 py-3 text-gray-600">
                <span class="block">{{ p.brand?.name }}</span>
                <span class="block text-xs text-gray-400">{{ p.category?.name }}</span>
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <span class="font-semibold text-[#111827]">{{ precio(p.price) }}</span>
                @if (p.compare_at_price !== null) { <span class="block text-xs text-gray-400 line-through">{{ precio(p.compare_at_price) }}</span> }
              </td>
              <td class="px-4 py-3 text-center">
                <button type="button" (click)="alternarPublicado(p)" [disabled]="ocupado().has(p.id)"
                        [attr.aria-label]="(p.is_published ? 'Ocultar ' : 'Publicar ') + p.name"
                        class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-50"
                        [class]="p.is_published ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'">
                  <i class="fas" [class]="p.is_published ? 'fa-eye' : 'fa-eye-slash'"></i> {{ p.is_published ? 'Publicado' : 'Oculto' }}
                </button>
              </td>
              <td class="px-4 py-3 text-center">
                <button type="button" (click)="alternarDestacado(p)" [disabled]="ocupado().has(p.id)"
                        [attr.aria-label]="(p.is_featured ? 'Quitar destacado de ' : 'Destacar ') + p.name" [attr.aria-pressed]="p.is_featured"
                        class="w-8 h-8 rounded-full hover:bg-yellow-50 disabled:opacity-50"
                        [class]="p.is_featured ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'">
                  <i class="fas fa-star"></i>
                </button>
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <a [routerLink]="['/admin/productos', p.id, 'editar']"
                   class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                  <i class="fas fa-pen"></i> Editar
                </a>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Tarjetas (< xl) -->
    <ul class="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-3" [class.opacity-60]="cargando() && filas().length > 0">
      @for (p of filas(); track p.id) {
        <li class="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
          <div class="flex gap-3">
            <div class="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
              @if (imagen(p); as src) {
                @if (fallidas().has(src)) { <app-imagen-no-disponible /> }
                @else { <img [src]="src" alt="" class="w-full h-full object-cover" loading="lazy" (error)="marcarFallida(src)" /> }
              } @else { <app-imagen-no-disponible /> }
            </div>
            <div class="min-w-0 flex-1">
              <a [routerLink]="['/admin/productos', p.id, 'editar']" class="font-semibold text-[#111827] line-clamp-2">{{ p.name }}</a>
              <p class="text-xs text-gray-500 truncate">{{ p.brand?.name }} · {{ p.category?.name }}</p>
              <p class="mt-1 text-sm">
                <span class="font-semibold">{{ precio(p.price) }}</span>
                @if (p.compare_at_price !== null) { <span class="ml-1 text-xs text-gray-400 line-through">{{ precio(p.compare_at_price) }}</span> }
              </p>
            </div>
          </div>
          <div class="mt-3 flex items-center gap-2">
            <button type="button" (click)="alternarPublicado(p)" [disabled]="ocupado().has(p.id)"
                    class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold disabled:opacity-50"
                    [class]="p.is_published ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'">
              <i class="fas" [class]="p.is_published ? 'fa-eye' : 'fa-eye-slash'"></i> {{ p.is_published ? 'Publicado' : 'Oculto' }}
            </button>
            <button type="button" (click)="alternarDestacado(p)" [disabled]="ocupado().has(p.id)" [attr.aria-pressed]="p.is_featured"
                    [attr.aria-label]="p.is_featured ? 'Quitar destacado' : 'Destacar'"
                    class="w-10 h-9 rounded-lg border border-gray-200 disabled:opacity-50" [class]="p.is_featured ? 'text-yellow-500' : 'text-gray-300'">
              <i class="fas fa-star"></i>
            </button>
            <a [routerLink]="['/admin/productos', p.id, 'editar']"
               class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700">
              <i class="fas fa-pen"></i> Editar
            </a>
          </div>
        </li>
      }
    </ul>

    <!-- Estados vacío / cargando -->
    @if (cargando() && filas().length === 0) {
      <div class="space-y-2 mt-2" aria-busy="true" aria-label="Cargando productos">
        @for (n of [1, 2, 3, 4, 5]; track n) { <div class="h-16 bg-white border border-gray-100 rounded-xl animate-pulse"></div> }
      </div>
    } @else if (!cargando() && !error() && filas().length === 0) {
      <div class="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
        <i class="fas fa-box-open text-3xl text-gray-300"></i>
        <p class="mt-3 font-medium text-gray-700">{{ hayFiltros() ? 'No hay productos con esos filtros.' : 'Todavía no hay productos.' }}</p>
        @if (hayFiltros()) { <button type="button" (click)="limpiar()" class="mt-2 text-[#E60000] font-medium hover:underline">Limpiar filtros</button> }
        @else { <a routerLink="/admin/productos/nuevo" class="mt-2 inline-block text-[#E60000] font-medium hover:underline">Crear el primero</a> }
      </div>
    }

    <!-- Paginación -->
    @if (total() > porPagina) {
      <nav class="mt-4 flex items-center justify-between gap-3 text-sm" aria-label="Paginación">
        <p class="text-gray-500">{{ desde() }}–{{ hasta() }} de {{ total() }}</p>
        <div class="flex items-center gap-2">
          <button type="button" (click)="irAPagina(pagina() - 1)" [disabled]="pagina() <= 1 || cargando()"
                  class="px-3 py-2 rounded-lg border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-50">
            <i class="fas fa-chevron-left"></i> Anterior
          </button>
          <span class="text-gray-600">Página {{ pagina() }} de {{ totalPaginas() }}</span>
          <button type="button" (click)="irAPagina(pagina() + 1)" [disabled]="pagina() >= totalPaginas() || cargando()"
                  class="px-3 py-2 rounded-lg border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-50">
            Siguiente <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </nav>
    }
  `
})
export class AdminProductosComponent implements OnInit, OnDestroy {
  private readonly catalogo = inject(AdminCatalogoService);
  private readonly ui = inject(AdminUiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly porPagina = POR_PAGINA;
  readonly q = signal('');
  readonly categoriaId = signal('');
  readonly marcaId = signal('');
  readonly estado = signal<EstadoFiltro>('todos');
  readonly soloDestacados = signal(false);
  readonly pagina = signal(1);

  readonly categorias = signal<OpcionCatalogo[]>([]);
  readonly marcas = signal<OpcionCatalogo[]>([]);
  readonly filas = signal<ProductoAdminRow[]>([]);
  readonly total = signal(0);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly ocupado = signal<ReadonlySet<string>>(new Set());
  readonly fallidas = signal<ReadonlySet<string>>(new Set());

  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.total() / POR_PAGINA)));
  readonly desde = computed(() => (this.total() === 0 ? 0 : (this.pagina() - 1) * POR_PAGINA + 1));
  readonly hasta = computed(() => Math.min(this.pagina() * POR_PAGINA, this.total()));
  readonly hayFiltros = computed(
    () => !!this.q().trim() || !!this.categoriaId() || !!this.marcaId() || this.estado() !== 'todos' || this.soloDestacados()
  );

  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private peticion = 0;

  ngOnInit(): void {
    const p = this.route.snapshot.queryParamMap;
    this.q.set(p.get('q') ?? '');
    this.categoriaId.set(p.get('categoria') ?? '');
    this.marcaId.set(p.get('marca') ?? '');
    const estado = p.get('estado');
    this.estado.set(estado === 'publicados' || estado === 'ocultos' ? estado : 'todos');
    this.soloDestacados.set(p.get('destacado') === '1');
    this.pagina.set(Math.max(1, Number(p.get('pagina')) || 1));

    void Promise.all([this.catalogo.listarCategorias(), this.catalogo.listarMarcas()])
      .then(([c, m]) => { this.categorias.set(c); this.marcas.set(m); })
      .catch(() => { /* los filtros quedan vacíos; el listado muestra su propio error */ });
    void this.cargar();
  }

  ngOnDestroy(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
  }

  precio(v: number | string): string {
    return formatoPrecio(Number(v));
  }

  imagen(p: ProductoAdminRow): string | null {
    const img = [...(p.images ?? [])].sort((a, b) => a.position - b.position)[0];
    return img ? this.catalogo.urlImagen(img) : null;
  }

  marcarFallida(url: string): void {
    this.fallidas.update(s => new Set(s).add(url));
  }

  cambiarBusqueda(valor: string): void {
    this.q.set(valor);
    this.pagina.set(1);
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => void this.cargar(), 300);
  }

  cambiarFiltro(clave: 'categoria' | 'marca' | 'estado' | 'destacado', valor: string): void {
    if (clave === 'categoria') this.categoriaId.set(valor);
    if (clave === 'marca') this.marcaId.set(valor);
    if (clave === 'estado') this.estado.set(valor === 'publicados' || valor === 'ocultos' ? valor : 'todos');
    if (clave === 'destacado') this.soloDestacados.set(valor === '1');
    this.pagina.set(1);
    void this.cargar();
  }

  limpiar(): void {
    this.q.set('');
    this.categoriaId.set('');
    this.marcaId.set('');
    this.estado.set('todos');
    this.soloDestacados.set(false);
    this.pagina.set(1);
    void this.cargar();
  }

  irAPagina(n: number): void {
    this.pagina.set(Math.min(Math.max(1, n), this.totalPaginas()));
    void this.cargar();
  }

  async cargar(): Promise<void> {
    const mia = ++this.peticion;
    this.cargando.set(true);
    this.error.set(null);
    this.sincronizarUrl();
    try {
      const r = await this.catalogo.listarProductos({
        q: this.q(),
        categoriaId: this.categoriaId(),
        marcaId: this.marcaId(),
        estado: this.estado(),
        destacado: this.soloDestacados(),
        pagina: this.pagina(),
        porPagina: POR_PAGINA
      });
      if (mia !== this.peticion) return; // llegó tarde: ya hay una consulta más reciente
      // Si la página quedó fuera de rango (p. ej. tras filtrar), volver a la última
      if (r.filas.length === 0 && r.total > 0 && this.pagina() > 1) {
        this.pagina.set(Math.max(1, Math.ceil(r.total / POR_PAGINA)));
        return void this.cargar();
      }
      this.filas.set(r.filas);
      this.total.set(r.total);
    } catch (e) {
      if (mia !== this.peticion) return;
      this.error.set(e instanceof ErrorAdmin ? e.message : 'No se pudo cargar el listado.');
    } finally {
      if (mia === this.peticion) this.cargando.set(false);
    }
  }

  private sincronizarUrl(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      replaceUrl: true,
      queryParams: {
        q: this.q().trim() || null,
        categoria: this.categoriaId() || null,
        marca: this.marcaId() || null,
        estado: this.estado() === 'todos' ? null : this.estado(),
        destacado: this.soloDestacados() ? '1' : null,
        pagina: this.pagina() > 1 ? this.pagina() : null
      }
    });
  }

  private marcarOcupado(id: string, ocupado: boolean): void {
    this.ocupado.update(s => {
      const n = new Set(s);
      if (ocupado) n.add(id); else n.delete(id);
      return n;
    });
  }

  async alternarPublicado(p: ProductoAdminRow): Promise<void> {
    if (this.ocupado().has(p.id)) return;
    const nuevo = !p.is_published;
    this.marcarOcupado(p.id, true);
    try {
      await this.catalogo.cambiarPublicado(p.id, nuevo);
      this.filas.update(fs => fs.map(f => (f.id === p.id ? { ...f, is_published: nuevo } : f)));
      this.ui.ok(nuevo ? `"${p.name}" ahora es visible en la tienda.` : `"${p.name}" quedó oculto.`);
    } catch (e) {
      this.ui.error(e instanceof ErrorAdmin ? e.message : 'No se pudo cambiar el estado.');
    } finally {
      this.marcarOcupado(p.id, false);
    }
  }

  async alternarDestacado(p: ProductoAdminRow): Promise<void> {
    if (this.ocupado().has(p.id)) return;
    const nuevo = !p.is_featured;
    this.marcarOcupado(p.id, true);
    try {
      await this.catalogo.cambiarDestacado(p.id, nuevo);
      this.filas.update(fs => fs.map(f => (f.id === p.id ? { ...f, is_featured: nuevo } : f)));
      this.ui.ok(nuevo ? `"${p.name}" ahora es destacado.` : `"${p.name}" ya no es destacado.`);
    } catch (e) {
      this.ui.error(e instanceof ErrorAdmin ? e.message : 'No se pudo cambiar el destacado.');
    } finally {
      this.marcarOcupado(p.id, false);
    }
  }
}
