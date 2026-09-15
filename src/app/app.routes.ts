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
    path: 'sucursales',
    component: SucursalesComponent,
    title: 'Sucursales y Contacto — Electro Bodegón'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
