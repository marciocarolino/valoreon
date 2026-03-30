import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { LoginRequest, LoginResponse, RefreshResponse, RegisterRequest } from '../models/auth.model';
import { User } from '../models/user.model';
import { UserService } from '../../../core/services/user.service';
import { StorageService } from '../../../core/services/storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'valoreon_access_token';

  private readonly storage     = inject(StorageService);
  private readonly http        = inject(HttpClient);
  private readonly userService = inject(UserService);

  private readonly _accessToken = signal<string | null>(
    this.storage.get<string>(this.TOKEN_KEY)
  );
  private readonly _currentUser = signal<User | null>(null);

  readonly accessToken     = this._accessToken.asReadonly();
  readonly currentUser     = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this._accessToken());

  /**
   * Authenticates the user, stores the access token, and loads the user profile.
   * The httpOnly refresh-token cookie is set by the backend response automatically.
   */
  login(email: string, password: string): Observable<User> {
    const payload: LoginRequest = { email, password };

    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, payload, {
        withCredentials: true,
      })
      .pipe(
        tap(response => this.setAccessToken(response.accessToken)),
        switchMap(() => this.userService.getMe()),
        tap(user => this._currentUser.set(user))
      );
  }

  /**
   * Calls POST /auth/refresh — the browser sends the httpOnly refresh-token cookie
   * automatically because of `withCredentials: true`.
   * Stores the new access token and returns the response for the interceptor.
   */
  tryRefresh(): Observable<RefreshResponse> {
    return this.http
      .post<RefreshResponse>(`${environment.apiUrl}/auth/refresh`, {}, {
        withCredentials: true,
      })
      .pipe(
        tap(response => this.setAccessToken(response.accessToken))
      );
  }

  register(name: string, email: string, password: string): Observable<void> {
    const payload: RegisterRequest = { name, email, password };
    return this.http.post<void>(`${environment.apiUrl}/user`, payload);
  }

  logout(): void {
    this.http
      .post<void>(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .subscribe({ error: () => {} }); // best-effort — always clear local state
    this.clearSession();
  }

  setAccessToken(token: string): void {
    this._accessToken.set(token);
    this.storage.set(this.TOKEN_KEY, token);
  }

  setUser(user: User): void {
    this._currentUser.set(user);
  }

  clearSession(): void {
    this._accessToken.set(null);
    this._currentUser.set(null);
    this.storage.remove(this.TOKEN_KEY);
  }

  getToken(): string | null {
    return this._accessToken();
  }
}
