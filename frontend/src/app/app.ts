import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './features/auth/services/auth.service';
import { UserService } from './core/services/user.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('Valoreon_Front');

  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);

  ngOnInit(): void {
    // Restore user profile on every page load if an access token exists.
    // On 401 the interceptor automatically tries to refresh the cookie-based
    // refresh token and retries the request. If the refresh also fails the
    // interceptor clears the session and redirects to /login.
    if (this.authService.isAuthenticated()) {
      this.userService.getMe().subscribe({
        next: user => this.authService.setUser(user),
        error: () => {},  // interceptor handles redirect on unrecoverable failure
      });
    }
  }
}
