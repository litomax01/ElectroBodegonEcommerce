import { Routes } from '@angular/router';
import { adminGuard, deniedGuard, loginGuard } from './core/admin.guards';

/**
 * Rutas del panel (carga diferida: no pesan en la tienda pública).
 * Todo /admin exige administrador salvo /admin/login y /admin/acceso-denegado.
 * La autorización real la imponen las políticas RLS de Supabase; estos guards solo
 * evitan mostrar pantallas a quien no corresponde.
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    canActivate: [loginGuard],
    title: 'Ingresar — Admin Electro Bodegón',
    loadComponent: () => import('./pages/login/admin-login.component').then(m => m.AdminLoginComponent)
  },
  {
    path: 'acceso-denegado',
    canActivate: [deniedGuard],
    title: 'Acceso denegado — Admin Electro Bodegón',
    loadComponent: () => import('./pages/denegado/admin-denegado.component').then(m => m.AdminDenegadoComponent)
  },
  {
    path: '',
    canActivate: [adminGuard],
    canActivateChild: [adminGuard],
    loadComponent: () => import('./layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Resumen — Admin Electro Bodegón',
        loadComponent: () => import('./pages/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
      },
      {
        path: 'productos',
        pathMatch: 'full',
        title: 'Productos — Admin Electro Bodegón',
        loadComponent: () => import('./pages/productos/admin-productos.component').then(m => m.AdminProductosComponent)
      },
      {
        path: 'productos/nuevo',
        title: 'Nuevo producto — Admin Electro Bodegón',
        loadComponent: () => import('./pages/producto-form/admin-producto-form.component').then(m => m.AdminProductoFormComponent)
      },
      {
        path: 'productos/:id/editar',
        title: 'Editar producto — Admin Electro Bodegón',
        loadComponent: () => import('./pages/producto-form/admin-producto-form.component').then(m => m.AdminProductoFormComponent)
      },
      { path: '**', redirectTo: '' }
    ]
  }
];
