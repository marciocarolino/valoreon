import { Component, computed, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../features/auth/services/auth.service';
import { User } from '../../features/auth/models/user.model';
import { ThemeService } from '../../core/services/theme.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly themeService = inject(ThemeService);

  readonly sidebarOpen = signal(false);
  readonly printersOpen = signal(this.router.url.startsWith('/impressoras'));
  readonly userMenuOpen = signal(false);
  readonly currentUser = this.authService.currentUser;

  /** Sidebar brand: user name from auth, else app name */
  readonly sidebarBrandName = computed(() => {
    const raw = this.authService.currentUser()?.name?.trim();
    if (!raw) return environment.appName;
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  });

  constructor() {
    // Auto-open printers submenu on navigation to any /impressoras route
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(e => {
        if (e.url.startsWith('/impressoras')) {
          this.printersOpen.set(true);
        }
      });
  }

  initials(user: User | null): string {
    if (!user?.name) return 'V';
    return user.name
      .split(' ')
      .slice(0, 2)
      .map((w: string) => w[0].toUpperCase())
      .join('');
  }

  toggleSidebar(): void { this.sidebarOpen.update(v => !v); }
  closeSidebar(): void { this.sidebarOpen.set(false); }
  togglePrinters(): void { this.printersOpen.update(v => !v); }
  toggleUserMenu(): void { this.userMenuOpen.update(v => !v); }

  @HostListener('document:click')
  closeUserMenu(): void { this.userMenuOpen.set(false); }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
