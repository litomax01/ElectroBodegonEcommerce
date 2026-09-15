import { Component, Input, Output, EventEmitter, signal, computed, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface FiltersState {
  categorias: string[];
  marcas: string[];
}

@Component({
  selector: 'app-sidebar-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
    // Apply initial values once data arrives
    if (changes['initialMarcas'] && this.initialMarcas.length > 0) {
      this.selectedMarcas.set([...this.initialMarcas]);
    }
    if (changes['initialCategorias'] && this.initialCategorias.length > 0) {
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
