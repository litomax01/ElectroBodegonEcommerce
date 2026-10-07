import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { CatalogoComponent } from './pages/catalogo/catalogo.component';
import { SucursalesComponent } from './pages/sucursales/sucursales.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    title: 'Electro Bodegón — Inicio'
  },
  {
    path: 'catalogo',
    component: CatalogoComponent,
    title: 'Catálogo Completo — Electro Bodegón'
  },
  {
    // El título lo define la propia página según el producto
    path: 'producto/:slug',
    loadComponent: () =>
      import('./pages/producto-detalle/producto-detalle.component').then(m => m.ProductoDetalleComponent)
  },
  {
    path: 'sucursales',
    component: SucursalesComponent,
    title: 'Sucursales y Contacto — Electro Bodegón'
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found.component').then(m => m.NotFoundComponent),
    title: 'Página no encontrada — Electro Bodegón'
  }
];
