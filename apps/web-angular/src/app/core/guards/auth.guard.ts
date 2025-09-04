import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map, take } from 'rxjs/operators';
import { AuthStore } from '../stores/auth.store';
import { AuthService } from '../services/auth.service';

/**
 * Guard that protects routes requiring authentication
 * Redirects to login page if user is not authenticated
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authStore = inject(AuthStore);
  const authService = inject(AuthService);
  const router = inject(Router);

  // If already authenticated, allow access
  if (authStore.isAuthenticated()) {
    return true;
  }

  // Check if there's a stored session that might still be valid
  const token = authStore.accessToken();
  if (token) {
    return authService.validateSession().pipe(
      take(1),
      map(isValid => {
        if (isValid) {
          return true;
        } else {
          // Session invalid, redirect to login
          router.navigate(['/login'], { 
            queryParams: { returnUrl: state.url } 
          });
          return false;
        }
      })
    );
  }

  // No authentication, redirect to login
  router.navigate(['/login'], { 
    queryParams: { returnUrl: state.url } 
  });
  return false;
};

/**
 * Guard that prevents authenticated users from accessing auth pages
 * Redirects to dashboard if user is already authenticated
 */
export const noAuthGuard: CanActivateFn = (route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.isAuthenticated()) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};

/**
 * Guard that requires email verification
 * Redirects to email verification page if email is not verified
 */
export const emailVerifiedGuard: CanActivateFn = (route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  const user = authStore.user();
  
  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  if (!user.emailVerified) {
    router.navigate(['/verify-email']);
    return false;
  }

  return true;
};

/**
 * Route matcher guard for lazy-loaded modules
 * Can be used with CanMatch for route-level protection
 */
export const authMatchGuard: CanMatchFn = (route, segments) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.isAuthenticated()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};