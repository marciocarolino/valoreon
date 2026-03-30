import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../auth/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class ProfileComponent {
  private readonly authService = inject(AuthService);

  readonly user = this.authService.currentUser;

  readonly initials = computed(() => {
    const name = this.user()?.name;
    if (!name) return 'V';
    return name
      .split(' ')
      .slice(0, 2)
      .map((w: string) => w[0].toUpperCase())
      .join('');
  });
}
