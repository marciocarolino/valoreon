import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../../features/auth/services/auth.service';

/**
 * Attaches the access token to every outgoing request and handles token refresh.
 *
 * Flow on 401:
 *  1. Call POST /auth/refresh (browser sends httpOnly refresh-token cookie automatically).
 *  2. If refresh succeeds → store new access token → retry original request.
 *  3. If refresh fails (cookie expired / revoked) → clear session → redirect to /login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  const authReq = addCredentials(req, authService.getToken());

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // Only attempt refresh on 401 from API calls — never on the refresh endpoint itself
      if (err.status === 401 && !req.url.includes('/auth/')) {
        return authService.tryRefresh().pipe(
          switchMap(response => {
            // Retry the original request with the new access token
            return next(addCredentials(req, response.accessToken));
          }),
          catchError(refreshErr => {
            // Refresh failed — session is truly expired
            authService.clearSession();
            router.navigate(['/login']);
            return throwError(() => refreshErr);
          })
        );
      }

      return throwError(() => err);
    })
  );
};

function addCredentials(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return req.clone({
    withCredentials: true,
    ...(token ? { setHeaders: { Authorization: `Bearer ${token}` } } : {}),
  });
}
