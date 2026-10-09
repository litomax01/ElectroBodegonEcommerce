import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminCatalogoService, ErrorAdmin } from '../../data/admin-catalogo.service';
import { ResumenCatalogo } from '../../data/admin.models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <header class="mb-6">
      <h1 class="font-montserrat font-extrabold text-2xl text-[#111827]">Resumen</h1>
      <p class="text-sm text-gray-500">Estado actual del catálogo.</p>
    </header>

    @if (error()) {
      <div role="alert" class="mb-6 flex items-center justify-between gap-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">
        <span><i class="fas fa-circle-exclamation mr-2"></i>{{ error() }}</span>
        <button type="button" (click)="cargar()" class="font-semibold underline">Reintentar</button>
      </div>
    }

    <section class="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4" aria-label="Indicadores del catálogo">
      @for (t of tarjetas(); track t.etiqueta) {
        <a [routerLink]="t.ruta" [queryParams]="t.params"
           class="group bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 hover:shadow-md hover:border-gray-200 transition-all">
          <div class="flex items-center justify-between">
            <span class="text-xs sm:text-sm font-medium text-gray-500">{{ t.etiqueta }}</span>
            <span class="w-9 h-9 rounded-xl flex items-center justify-center" [class]="t.color"><i class="fas" [class]="t.icono"></i></span>
          </div>
          <p class="mt-3 font-montserrat font-extrabold text-3xl text-[#111827]">
            @if (cargando()) { <span class="inline-block h-8 w-14 bg-gray-100 rounded animate-pulse"></span> } @else { {{ t.valor }} }
          </p>
        </a>
      }
    </section>

    <section class="mt-8" aria-label="Accesos rápidos">
      <h2 class="font-montserrat font-bold text-lg text-[#111827] mb-3">Accesos rápidos</h2>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <a routerLink="/admin/productos/nuevo"
           class="flex items-center gap-3 rounded-xl bg-[#E60000] hover:bg-[#c40000] text-white px-4 py-3.5 font-semibold transition-colors">
          <i class="fas fa-plus"></i> Nuevo producto
        </a>
        <a routerLink="/admin/productos"
           class="flex items-center gap-3 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-[#111827] px-4 py-3.5 font-semibold transition-colors">
          <i class="fas fa-box-open text-gray-500"></i> Ver productos
        </a>
        <a href="/" target="_blank" rel="noopener"
           class="flex items-center gap-3 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-[#111827] px-4 py-3.5 font-semibold transition-colors">
          <i class="fas fa-arrow-up-right-from-square text-gray-500"></i> Ver tienda pública
        </a>
      </div>
    </section>
  `
})
export class AdminDashboardComponent implements OnInit {
  private readonly catalogo = inject(AdminCatalogoService);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly resumen = signal<ResumenCatalogo | null>(null);

  readonly tarjetas = () => {
    const r = this.resumen();
    const v = (n: number | undefined) => (r ? String(n) : '');
    return [
      { etiqueta: 'Total de productos', valor: v(r?.total), icono: 'fa-boxes-stacked', color: 'bg-gray-100 text-gray-700', ruta: '/admin/productos', params: {} },
      { etiqueta: 'Publicados', valor: v(r?.publicados), icono: 'fa-eye', color: 'bg-green-50 text-green-700', ruta: '/admin/productos', params: { estado: 'publicados' } },
      { etiqueta: 'Ocultos', valor: v(r?.ocultos), icono: 'fa-eye-slash', color: 'bg-amber-50 text-amber-700', ruta: '/admin/productos', params: { estado: 'ocultos' } },
      { etiqueta: 'Destacados', valor: v(r?.destacados), icono: 'fa-star', color: 'bg-yellow-50 text-yellow-700', ruta: '/admin/productos', params: { destacado: '1' } },
      { etiqueta: 'Categorías', valor: v(r?.categorias), icono: 'fa-layer-group', color: 'bg-blue-50 text-blue-700', ruta: '/admin/productos', params: {} },
      { etiqueta: 'Marcas', valor: v(r?.marcas), icono: 'fa-tags', color: 'bg-purple-50 text-purple-700', ruta: '/admin/productos', params: {} }
    ];
  };

  ngOnInit(): void {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.resumen.set(await this.catalogo.resumen());
    } catch (e) {
      this.error.set(e instanceof ErrorAdmin ? e.message : 'No se pudo cargar el resumen.');
    } finally {
      this.cargando.set(false);
    }
  }
}
