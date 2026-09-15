import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { Producto } from '../../models/producto.model';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { SidebarFiltersComponent, FiltersState } from '../../components/sidebar-filters/sidebar-filters.component';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductCardComponent, SidebarFiltersComponent],
  templateUrl: './catalogo.component.html'
})
export class CatalogoComponent implements OnInit {
  allProductos = signal<Producto[]>([]);
  categorias = signal<string[]>([]);
  marcas = signal<string[]>([]);
  productosFiltrados = signal<Producto[]>([]);
  loading = signal(true);
  skeletons = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  searchQuery = '';
  sortBy = 'default';
  activeFilters: FiltersState = { categorias: [], marcas: [] };

  // Initial values from query params (for sidebar pre-selection)
  initialMarcas: string[] = [];
  initialCategorias: string[] = [];

  constructor(
    private productService: ProductService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Read query params first (marca and/or categoria from Home navigation)
    this.route.queryParams.subscribe(params => {
      const marcaParam = params['marca'];
      const categoriaParam = params['categoria'];

      if (marcaParam) {
        this.initialMarcas = [marcaParam];
        this.activeFilters.marcas = [marcaParam];
      }
      if (categoriaParam) {
        this.initialCategorias = [categoriaParam];
        this.activeFilters.categorias = [categoriaParam];
      }

      // Load products
      this.productService.getAll().subscribe({
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
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onSortChange(): void {
    this.applyFilters();
  }

  resetAll(): void {
    this.searchQuery = '';
    this.sortBy = 'default';
    this.activeFilters = { categorias: [], marcas: [] };
    this.initialMarcas = [];
    this.initialCategorias = [];
    this.applyFilters();
  }

  private applyFilters(): void {
    let result = [...this.allProductos()];

    if (this.activeFilters.categorias.length > 0) {
      result = result.filter(p => this.activeFilters.categorias.includes(p.categoria));
    }
    if (this.activeFilters.marcas.length > 0) {
      result = result.filter(p => this.activeFilters.marcas.includes(p.marca));
    }

    const query = this.searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter(p =>
        p.nombre.toLowerCase().includes(query) ||
        p.marca.toLowerCase().includes(query) ||
        p.categoria.toLowerCase().includes(query) ||
        (p.descripcion?.toLowerCase().includes(query) ?? false)
      );
    }

    switch (this.sortBy) {
      case 'precio_asc':
        result.sort((a, b) => a.precio_oferta - b.precio_oferta);
        break;
      case 'precio_desc':
        result.sort((a, b) => b.precio_oferta - a.precio_oferta);
        break;
      case 'descuento':
        result.sort((a, b) =>
          (b.precio_original - b.precio_oferta) / b.precio_original -
          (a.precio_original - a.precio_oferta) / a.precio_original
        );
        break;
      case 'nombre':
        result.sort((a, b) => a.nombre.localeCompare(b.nombre));
        break;
    }

    this.productosFiltrados.set(result);
  }

  trackById(_: number, p: Producto): number {
    return p.id;
  }
}
