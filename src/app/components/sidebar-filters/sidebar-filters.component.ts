import { Component, Input, Output, EventEmitter, signal, computed, OnChanges, SimpleChanges } from '@angular/core';

export interface FiltersState {
  categorias: string[];
  marcas: string[];
}

@Component({
  selector: 'app-sidebar-filters',
  standalone: true,
  imports: [],
  templateUrl: './sidebar-filters.component.html'
})
export class SidebarFiltersComponent implements OnChanges {
  @Input() categorias: string[] = [];
  @Input() marcas: string[] = [];
  @Input() totalResultados: number = 0;
  /** Pre-selected marcas from query params */
  @Input() initialMarcas: string[] = [];
  /** Pre-selected categorias from query params */
  @Input() initialCategorias: string[] = [];
  @Output() filtersChanged = new EventEmitter<FiltersState>();

  selectedCategorias = signal<string[]>([]);
  selectedMarcas = signal<string[]>([]);

  hasActiveFilters = computed(() =>
    this.selectedCategorias().length > 0 || this.selectedMarcas().length > 0
  );

  ngOnChanges(changes: SimpleChanges): void {
    // Sincroniza la selección con el padre (query params o "Limpiar filtros").
    // También se aplica cuando llega un arreglo vacío, para desmarcar las casillas.
    if (changes['initialMarcas']) {
      this.selectedMarcas.set([...this.initialMarcas]);
    }
    if (changes['initialCategorias']) {
      this.selectedCategorias.set([...this.initialCategorias]);
    }
  }

  toggleCategoria(cat: string): void {
    this.selectedCategorias.update(current => {
      const idx = current.indexOf(cat);
      return idx > -1 ? current.filter(c => c !== cat) : [...current, cat];
    });
    this.emitFilters();
  }

  toggleMarca(marca: string): void {
    this.selectedMarcas.update(current => {
      const idx = current.indexOf(marca);
      return idx > -1 ? current.filter(m => m !== marca) : [...current, marca];
    });
    this.emitFilters();
  }

  clearFilters(): void {
    this.selectedCategorias.set([]);
    this.selectedMarcas.set([]);
    this.emitFilters();
  }

  private emitFilters(): void {
    this.filtersChanged.emit({
      categorias: this.selectedCategorias(),
      marcas: this.selectedMarcas()
    });
  }
}
