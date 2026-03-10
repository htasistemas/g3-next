import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, signal } from '@angular/core';

export interface PaletteSettings {
  primaryStrong: string;
  primaryGradient: string;
  background: string;
  surface: string;
  border: string;
  cardRadius: string;
  controlRadius: string;
}

const defaultPalette: PaletteSettings = {
  primaryStrong: '#0c5c34',
  primaryGradient: '#16a34a',
  background: '#f1f5f9',
  surface: '#ffffff',
  border: '#e2e8f0',
  cardRadius: '1rem',
  controlRadius: '0.75rem'
};

@Injectable({ providedIn: 'root' })
export class PersonalizationService {
  private readonly storageKey = 'g3_palette';
  readonly palette = signal<PaletteSettings>(this.loadPalette());

  constructor(@Inject(DOCUMENT) private readonly document: Document) {
    this.applyPalette(this.palette());
  }

  updatePalette(partial: Partial<PaletteSettings>): void {
    const merged = { ...this.palette(), ...partial };
    this.palette.set(merged);
    localStorage.setItem(this.storageKey, JSON.stringify(merged));
    this.applyPalette(merged);
  }

  reset(): void {
    this.palette.set(defaultPalette);
    localStorage.removeItem(this.storageKey);
    this.applyPalette(defaultPalette);
  }

  private applyPalette(palette: PaletteSettings): void {
    const root = this.document.documentElement.style;
    root.setProperty('--primary-strong', palette.primaryStrong);
    root.setProperty('--primary-gradient-end', palette.primaryGradient);
    root.setProperty('--bg-muted', palette.background);
    root.setProperty('--surface', palette.surface);
    root.setProperty('--border-color', palette.border);
    root.setProperty('--radius-card', palette.cardRadius);
    root.setProperty('--radius-control', palette.controlRadius);
  }

  private loadPalette(): PaletteSettings {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as PaletteSettings;
        return { ...defaultPalette, ...parsed };
      } catch (error) {
        console.warn('Não foi possível carregar personalização salva', error);
      }
    }
    return defaultPalette;
  }
}

