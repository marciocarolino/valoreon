import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly THEME_KEY = 'valoreon_theme';
  private readonly storage = inject(StorageService);
  private readonly doc = inject(DOCUMENT);

  readonly theme = signal<Theme>(
    this.storage.get<Theme>(this.THEME_KEY) ?? 'dark'
  );

  constructor() {
    // Reactively applies the class to <body> whenever theme signal changes.
    // Runs once immediately on init (restoring persisted theme).
    effect(() => {
      const t = this.theme();
      const body = this.doc.body;
      body.classList.remove('dark', 'light', 'dark-theme', 'light-theme');
      body.classList.add(t, `${t}-theme`);
      this.storage.set(this.THEME_KEY, t);
    });
  }

  toggle(): void {
    this.theme.update(t => (t === 'dark' ? 'light' : 'dark'));
  }
}
