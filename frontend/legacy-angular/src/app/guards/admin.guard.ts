import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const permissoes = auth.user()?.permissoes ?? [];
  const isAdmin = permissoes.includes('ADMINISTRADOR');
  if (isAdmin) {
    return true;
  }
  router.navigate(['/']);
  return false;
};
