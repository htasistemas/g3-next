import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'g3_theme';
  private readonly storageMigracaoKey = 'g3_theme_migrado_20260209';
  readonly currentTheme = signal<ThemeMode>(this.loadStoredTheme());

  constructor(@Inject(DOCUMENT) private readonly document: Document) {
    this.applyTheme(this.currentTheme());
  }

  toggleTheme(): void {
    const next = this.currentTheme() === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }

  setTheme(theme: ThemeMode): void {
    this.currentTheme.set(theme);
    localStorage.setItem(this.storageKey, theme);
    this.applyTheme(theme);
  }

  private applyTheme(theme: ThemeMode): void {
    const body = this.document.body;
    body.classList.remove('theme-light', 'theme-dark');
    body.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
  }

  private loadStoredTheme(): ThemeMode {
    const migrado = localStorage.getItem(this.storageMigracaoKey);
    const stored = localStorage.getItem(this.storageKey) as ThemeMode | null;

    if (!migrado) {
      if (stored === 'dark') {
        localStorage.removeItem(this.storageKey);
      }
      localStorage.setItem(this.storageMigracaoKey, '1');
      return 'light';
    }

    if (stored === 'dark' || stored === 'light') {
      return stored;
    }

    return 'light';
  }
}

