import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { AdminCatalogoService, ErrorAdmin } from '../../data/admin-catalogo.service';
import { AdminUiService } from '../../core/admin-ui.service';
import { ImagenAdmin } from '../../data/admin.models';
import { ImagenNoDisponibleComponent } from '../../../components/imagen-no-disponible/imagen-no-disponible.component';

/**
 * Galería del producto en el panel: subir (Storage), previsualizar, elegir la principal,
 * ordenar, reemplazar y eliminar. Las imágenes nuevas se guardan en catalog-media
 * (storage_path); las del catálogo antiguo siguen usando external_url.
 */
@Component({
  selector: 'app-producto-imagenes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ImagenNoDisponibleComponent],
  template: `
    <div class="flex items-center justify-between gap-3 mb-3">
      <p class="text-sm text-gray-500">
        La primera imagen es la principal. JPG, PNG, WebP o AVIF · máx. 5 MB.
      </p>
      <label class="shrink-0 inline-flex items-center gap-2 rounded-lg bg-[#111827] hover:bg-black text-white text-sm font-semibold px-3.5 py-2 cursor-pointer transition-colors"
             [class.opacity-60]="ocupado()" [class.pointer-events-none]="ocupado()">
        <i class="fas" [class]="subiendo() ? 'fa-spinner fa-spin' : 'fa-upload'"></i>
        {{ subiendo() ? 'Subiendo…' : 'Subir imágenes' }}
        <input #nuevo type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" class="sr-only"
               [disabled]="ocupado()" (change)="subir($any($event.target).files); nuevo.value = ''" />
      </label>
    </div>

    @if (lista().length === 0) {
      <div class="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
        <i class="fas fa-images text-2xl text-gray-300"></i>
        <p class="mt-2">Este producto aún no tiene imágenes.</p>
      </div>
    } @else {
      <ul class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        @for (img of lista(); track img.id; let i = $index; let ultimo = $last) {
          <li class="rounded-xl border bg-white overflow-hidden flex flex-col" [class]="i === 0 ? 'border-[#E60000] ring-1 ring-[#E60000]/30' : 'border-gray-200'">
            <div class="relative aspect-square bg-gray-50">
              @if (url(img); as src) {
                @if (fallidas().has(img.id)) { <app-imagen-no-disponible /> }
                @else { <img [src]="src" [alt]="'Imagen ' + (i + 1)" class="absolute inset-0 w-full h-full object-contain p-1" (error)="marcarFallida(img.id)" /> }
              } @else { <app-imagen-no-disponible /> }
              @if (i === 0) {
                <span class="absolute top-2 left-2 bg-[#E60000] text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full">Principal</span>
              }
              @if (!img.storage_path) {
                <span class="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full" title="Imagen externa del catálogo antiguo">Externa</span>
              }
            </div>
            <div class="p-2 flex flex-wrap items-center justify-between gap-1 text-xs">
              <div class="flex items-center gap-1">
                <button type="button" (click)="mover(i, -1)" [disabled]="ocupado() || i === 0" [attr.aria-label]="'Mover imagen ' + (i + 1) + ' antes'"
                        class="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30"><i class="fas fa-arrow-left"></i></button>
                <button type="button" (click)="mover(i, 1)" [disabled]="ocupado() || ultimo" [attr.aria-label]="'Mover imagen ' + (i + 1) + ' después'"
                        class="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30"><i class="fas fa-arrow-right"></i></button>
              </div>
              <div class="flex items-center gap-1">
                @if (i !== 0) {
                  <button type="button" (click)="hacerPrincipal(i)" [disabled]="ocupado()" [attr.aria-label]="'Hacer principal la imagen ' + (i + 1)"
                          title="Hacer principal" class="w-8 h-8 rounded-lg border border-gray-200 hover:bg-yellow-50 text-yellow-600 disabled:opacity-30"><i class="fas fa-star"></i></button>
                }
                <label class="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center cursor-pointer"
                       [class.opacity-30]="ocupado()" [class.pointer-events-none]="ocupado()" title="Reemplazar" [attr.aria-label]="'Reemplazar la imagen ' + (i + 1)">
                  <i class="fas fa-arrows-rotate"></i>
                  <input #repl type="file" accept="image/jpeg,image/png,image/webp,image/avif" class="sr-only"
                         [disabled]="ocupado()" (change)="reemplazar(img, $any($event.target).files); repl.value = ''" />
                </label>
                <button type="button" (click)="eliminar(img, i)" [disabled]="ocupado()" [attr.aria-label]="'Eliminar la imagen ' + (i + 1)"
                        title="Eliminar" class="w-8 h-8 rounded-lg border border-gray-200 hover:bg-red-50 text-[#E60000] disabled:opacity-30"><i class="fas fa-trash"></i></button>
              </div>
            </div>
          </li>
        }
      </ul>
    }
  `
})
export class ProductoImagenesComponent {
  private readonly catalogo = inject(AdminCatalogoService);
  private readonly ui = inject(AdminUiService);

  readonly productId = input.required<string>();
  /** Imágenes con las que se carga el producto */
  readonly imagenes = input<ImagenAdmin[]>([]);

  readonly lista = signal<ImagenAdmin[]>([]);
  readonly ocupado = signal(false);
  readonly subiendo = signal(false);
  readonly fallidas = signal<ReadonlySet<string>>(new Set());

  constructor() {
    effect(() => {
      this.lista.set([...this.imagenes()].sort((a, b) => a.position - b.position));
      this.fallidas.set(new Set());
    });
  }

  url(img: ImagenAdmin): string | null {
    return this.catalogo.urlImagen(img);
  }

  marcarFallida(id: string): void {
    this.fallidas.update(s => new Set(s).add(id));
  }

  async subir(archivos: FileList | null): Promise<void> {
    if (!archivos?.length || this.ocupado()) return;
    this.ocupado.set(true);
    this.subiendo.set(true);
    let subidas = 0;
    try {
      for (const archivo of Array.from(archivos)) {
        const posicion = this.lista().reduce((m, i) => Math.max(m, i.position), -1) + 1;
        try {
          const nueva = await this.catalogo.agregarImagen(this.productId(), archivo, posicion);
          this.lista.update(l => [...l, nueva]);
          subidas++;
        } catch (e) {
          this.ui.error(e instanceof ErrorAdmin ? e.message : `No se pudo subir "${archivo.name}".`);
        }
      }
      if (subidas) this.ui.ok(subidas === 1 ? 'Imagen subida.' : `${subidas} imágenes subidas.`);
    } finally {
      this.subiendo.set(false);
      this.ocupado.set(false);
    }
  }

  async reemplazar(img: ImagenAdmin, archivos: FileList | null): Promise<void> {
    const archivo = archivos?.[0];
    if (!archivo || this.ocupado()) return;
    this.ocupado.set(true);
    try {
      const nueva = await this.catalogo.reemplazarImagen(img, archivo);
      this.lista.update(l => l.map(x => (x.id === img.id ? nueva : x)));
      this.fallidas.update(s => { const n = new Set(s); n.delete(img.id); return n; });
      this.ui.ok('Imagen reemplazada.');
    } catch (e) {
      this.ui.error(e instanceof ErrorAdmin ? e.message : 'No se pudo reemplazar la imagen.');
    } finally {
      this.ocupado.set(false);
    }
  }

  async eliminar(img: ImagenAdmin, indice: number): Promise<void> {
    if (this.ocupado()) return;
    const ok = await this.ui.confirmar({
      titulo: 'Eliminar imagen',
      mensaje: indice === 0 && this.lista().length > 1
        ? 'Es la imagen principal: la siguiente pasará a ser la principal. Esta acción no se puede deshacer.'
        : 'Esta acción no se puede deshacer.',
      confirmar: 'Eliminar',
      peligro: true
    });
    if (!ok) return;
    this.ocupado.set(true);
    try {
      await this.catalogo.eliminarImagen(img);
      this.lista.update(l => l.filter(x => x.id !== img.id));
      this.ui.ok('Imagen eliminada.');
    } catch (e) {
      this.ui.error(e instanceof ErrorAdmin ? e.message : 'No se pudo eliminar la imagen.');
    } finally {
      this.ocupado.set(false);
    }
  }

  mover(indice: number, delta: -1 | 1): Promise<void> {
    const orden = [...this.lista()];
    const destino = indice + delta;
    if (destino < 0 || destino >= orden.length) return Promise.resolve();
    [orden[indice], orden[destino]] = [orden[destino], orden[indice]];
    return this.aplicarOrden(orden);
  }

  hacerPrincipal(indice: number): Promise<void> {
    const orden = [...this.lista()];
    const [elegida] = orden.splice(indice, 1);
    orden.unshift(elegida);
    return this.aplicarOrden(orden);
  }

  private async aplicarOrden(orden: ImagenAdmin[]): Promise<void> {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    const anterior = this.lista();
    this.lista.set(orden.map((img, i) => ({ ...img, position: i }))); // se refleja al instante
    try {
      await this.catalogo.ordenarImagenes(this.productId(), orden.map(i => i.id));
      this.ui.ok('Orden actualizado.');
    } catch (e) {
      this.lista.set(anterior);
      this.ui.error(e instanceof ErrorAdmin ? e.message : 'No se pudo cambiar el orden.');
    } finally {
      this.ocupado.set(false);
    }
  }
}
