import { MediaMatcher } from '@angular/cdk/layout';
import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'gif-search-theme';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly _document = inject(DOCUMENT);
  private readonly _root = this._document.documentElement;
  private readonly _prefersDarkQuery = inject(MediaMatcher).matchMedia(
    '(prefers-color-scheme: dark)',
  );

  private readonly _pinned = signal(this._readPinned());
  private readonly _prefersDark = signal(this._prefersDarkQuery.matches);

  readonly theme = computed<Theme>(
    () => this._pinned() ?? (this._prefersDark() ? 'dark' : 'light'),
  );

  constructor() {
    const onChange = (event: MediaQueryListEvent): void => this._prefersDark.set(event.matches);
    this._prefersDarkQuery.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() =>
      this._prefersDarkQuery.removeEventListener('change', onChange),
    );
  }

  toggle(): void {
    const theme: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this._pinned.set(theme);
    this._root.dataset['theme'] = theme;
    try {
      this._document.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, theme);
      // eslint-disable-next-line no-empty
    } catch {}
  }

  private _readPinned(): Theme | undefined {
    const pinned = this._root.dataset['theme'];
    return pinned === 'light' || pinned === 'dark' ? pinned : undefined;
  }
}
