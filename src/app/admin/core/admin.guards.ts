import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuthService } from './admin-auth.service';

/** Protege todo /admin salvo el login: solo pasa un administrador. */
export const adminGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AdminAuthService);
  const router = inject(Router);
  await auth.inicializar();
  switch (auth.estado()) {
    case 'admin':
      return true;
    case 'no-admin':
      return router.createUrlTree(['/admin/acceso-denegado']);
    default:
      return router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: state.url } });
  }
};

/** /admin/login: si ya hay sesión, redirige según el estado. */
export const loginGuard: CanActivateFn = async () => {
  const auth = inject(AdminAuthService);
  const router = inject(Router);
  await auth.inicializar();
  switch (auth.estado()) {
    case 'admin':
      return router.createUrlTree(['/admin']);
    case 'no-admin':
      return router.createUrlTree(['/admin/acceso-denegado']);
    default:
      return true;
  }
};

/** /admin/acceso-denegado: solo para usuarios autenticados que no son administradores. */
export const deniedGuard: CanActivateFn = async () => {
  const auth = inject(AdminAuthService);
  const router = inject(Router);
  await auth.inicializar();
  switch (auth.estado()) {
    case 'no-admin':
      return true;
    case 'admin':
      return router.createUrlTree(['/admin']);
    default:
      return router.createUrlTree(['/admin/login']);
  }
};
