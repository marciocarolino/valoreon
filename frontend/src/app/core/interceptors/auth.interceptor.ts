import { HttpInterceptorFn, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../../features/auth/services/auth.service';

/**
 * Attaches the access token to every outgoing request and handles token refresh.
 *
 * Flow on 401:
 *  1. Call POST /auth/refresh once — concurrent 401s queue until refresh completes.
 *  2. If refresh succeeds → store new access token → retry all queued requests.
 *  3. If refresh fails (cookie expired / revoked) → clear session → redirect to /login.
 */

let isRefreshing = false;
const refreshToken$ = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  const authReq = addCredentials(req, authService.getToken());

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || req.url.includes('/auth/')) {
        return throwError(() => err);
      }

      if (isRefreshing) {
        // Another request is already refreshing — wait for the new token then retry
        return refreshToken$.pipe(
          filter(token => token !== null),
          take(1),
          switchMap(token => next(addCredentials(req, token))),
        );
      }

      isRefreshing = true;
      refreshToken$.next(null);

      return authService.tryRefresh().pipe(
        switchMap(response => {
          isRefreshing = false;
          refreshToken$.next(response.accessToken);
          return next(addCredentials(req, response.accessToken));
        }),
        catchError(refreshErr => {
          isRefreshing = false;
          refreshToken$.next(null);
          authService.clearSession();
          router.navigate(['/login']);
          return throwError(() => refreshErr);
        }),
      );
    })
  );
};

function addCredentials(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return req.clone({
    withCredentials: true,
    ...(token ? { setHeaders: { Authorization: `Bearer ${token}` } } : {}),
  });
}
