import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';

/**
 * Solo la portada va en el paquete inicial; el resto de páginas se descargan al visitarlas.
 * Los títulos de las rutas son un valor por defecto: cada página fija su SEO completo con SeoService.
 */
export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    title: 'Electro Bodegón — Inicio'
  },
  {
    path: 'catalogo',
    loadComponent: () => import('./pages/catalogo/catalogo.component').then(m => m.CatalogoComponent),
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
    loadComponent: () => import('./pages/sucursales/sucursales.component').then(m => m.SucursalesComponent),
    title: 'Sucursales y Contacto — Electro Bodegón'
  },
  {
    // Panel de administración (carga diferida, protegido por guards)
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES)
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found.component').then(m => m.NotFoundComponent),
    title: 'Página no encontrada — Electro Bodegón'
  }
];
