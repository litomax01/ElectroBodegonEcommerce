import { Component, DestroyRef, OnInit, Renderer2, computed, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductRepository } from '../../data/repositories/product.repository';
import { Producto, ProductoId } from '../../core/models/producto.model';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { SidebarFiltersComponent, FiltersState } from '../../components/sidebar-filters/sidebar-filters.component';
import { Orden, filtrarProductos, leerParams } from './catalogo-filtros';
import { SeoService } from '../../core/seo/seo.service';
import { migasLd } from '../../core/seo/seo-schema';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [FormsModule, RouterLink, ProductCardComponent, SidebarFiltersComponent],
  templateUrl: './catalogo.component.html',
  host: { '(document:keydown.escape)': 'cerrarFiltros()' }
})
export class CatalogoComponent implements OnInit {
  allProductos = signal<Producto[]>([]);
  categorias = signal<string[]>([]);
  marcas = signal<string[]>([]);
  productosFiltrados = signal<Producto[]>([]);
  loading = signal(true);
  skeletons = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  /** Panel de filtros en móvil (drawer) */
  filtrosAbiertos = signal(false);

  searchQuery = '';
  sortBy: Orden = 'default';
  activeFilters: FiltersState = { categorias: [], marcas: [] };
  totalFiltrosActivos = signal(0);

  // Valores que el padre impone al panel (query params o "Limpiar")
  initialMarcas: string[] = [];
  initialCategorias: string[] = [];

  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly renderer = inject(Renderer2);
  private readonly seo = inject(SeoService);

  readonly hayResultados = computed(() => this.productosFiltrados().length > 0);

  constructor(
    private productRepository: ProductRepository,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.destroyRef.onDestroy(() => this.bloquearScroll(false));
  }

  ngOnInit(): void {
    // El canonical es siempre /catalogo: las variantes con filtros u orden no se indexan por separado
    this.seo.set({
      titulo: 'Catálogo de electrodomésticos, TV y línea blanca — Electro Bodegón',
      descripcion: 'Explora todo el catálogo de Electro Bodegón: televisores, refrigeradoras, lavadoras, cocinas y electrodomésticos menores de Samsung, LG, Mabe, Oster y más.',
      ruta: '/catalogo',
      jsonLd: [migasLd([{ nombre: 'Inicio', ruta: '/' }, { nombre: 'Catálogo', ruta: '/catalogo' }], u => this.seo.absoluta(u))]
    });

    // Productos: se cargan una sola vez
    this.productRepository.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (productos) => {
          this.allProductos.set(productos);
          const cats = [...new Set(productos.map(p => p.categoria))].sort();
          const marcas = [...new Set(productos.map(p => p.marca))].sort();
          this.categorias.set(cats);
          this.marcas.set(marcas);
          this.applyFilters();
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });

    // Query params; se reaplican en cada cambio de URL (incluye atrás/adelante).
    // Búsqueda y orden solo se toman de la URL si vienen en ella (ej. enlaces externos).
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const estado = leerParams(params);
        this.initialMarcas = estado.marcas;
        this.initialCategorias = estado.categorias;
        this.activeFilters = {
          marcas: [...estado.marcas],
          categorias: [...estado.categorias]
        };
        if (estado.busqueda !== undefined) this.searchQuery = estado.busqueda;
        if (estado.orden !== undefined) this.sortBy = estado.orden;
        this.applyFilters();
      });
  }

  get activeMarcaLabel(): string {
    if (this.activeFilters.marcas.length === 1) return this.activeFilters.marcas[0];
    return '';
  }

  get activeCategoriaLabel(): string {
    if (this.activeFilters.categorias.length === 1) return this.activeFilters.categorias[0];
    return '';
  }

  onFiltersChanged(filters: FiltersState): void {
    this.activeFilters = filters;
    this.applyFilters();
    // "Limpiar" dentro del panel: si la URL todavía trae marca/categoría, también se quita
    if (filters.marcas.length === 0 && filters.categorias.length === 0) {
      this.limpiarUrl();
    }
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onSortChange(): void {
    this.applyFilters();
  }

  /** Quita marcas y categorías (conserva búsqueda y orden) */
  limpiarFiltros(): void {
    this.activeFilters = { categorias: [], marcas: [] };
    this.initialMarcas = [];
    this.initialCategorias = [];
    this.applyFilters();
    this.limpiarUrl();
  }

  resetAll(): void {
    this.searchQuery = '';
    this.sortBy = 'default';
    this.limpiarFiltros();
  }

  // ---------------- Drawer móvil ----------------

  abrirFiltros(): void {
    this.filtrosAbiertos.set(true);
    this.bloquearScroll(true);
  }

  cerrarFiltros(): void {
    if (!this.filtrosAbiertos()) return;
    this.filtrosAbiertos.set(false);
    this.bloquearScroll(false);
  }

  /** Evita que el fondo se desplace y oculta el botón flotante mientras el panel está abierto */
  private bloquearScroll(bloquear: boolean): void {
    const body = this.document.body;
    if (bloquear) this.renderer.addClass(body, 'drawer-abierto');
    else this.renderer.removeClass(body, 'drawer-abierto');
  }

  // ----------------------------------------------

  /** Quita los query params para que no se vuelvan a aplicar */
  private limpiarUrl(): void {
    if (this.route.snapshot.queryParamMap.keys.length > 0) {
      this.router.navigate([], { relativeTo: this.route, queryParams: {} });
    }
  }

  private applyFilters(): void {
    this.totalFiltrosActivos.set(this.activeFilters.marcas.length + this.activeFilters.categorias.length);
    this.productosFiltrados.set(
      filtrarProductos(this.allProductos(), {
        marcas: this.activeFilters.marcas,
        categorias: this.activeFilters.categorias,
        busqueda: this.searchQuery,
        orden: this.sortBy
      })
    );
  }

  trackById(_: number, p: Producto): ProductoId {
    return p.id;
  }
}
