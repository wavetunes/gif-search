import { MediaMatcher } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';

import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

class FakeColorSchemeQuery {
  private readonly _listeners = new Set<(event: MediaQueryListEvent) => void>();

  constructor(public matches: boolean) {}

  addEventListener(_type: 'change', listener: (event: MediaQueryListEvent) => void): void {
    this._listeners.add(listener);
  }

  removeEventListener(_type: 'change', listener: (event: MediaQueryListEvent) => void): void {
    this._listeners.delete(listener);
  }

  setPrefersDark(matches: boolean): void {
    this.matches = matches;
    this._listeners.forEach((listener) => listener({ matches } as MediaQueryListEvent));
  }
}

describe('ThemeService', () => {
  let query: FakeColorSchemeQuery;

  function create(prefersDark: boolean): ThemeService {
    query = new FakeColorSchemeQuery(prefersDark);
    TestBed.configureTestingModule({
      providers: [{ provide: MediaMatcher, useValue: { matchMedia: () => query } }],
    });
    return TestBed.inject(ThemeService);
  }

  afterEach(() => {
    delete document.documentElement.dataset['theme'];
    localStorage.removeItem(THEME_STORAGE_KEY);
  });

  it('should follow the OS preference until a theme is picked', () => {
    expect(create(true).theme()).toBe('dark');
  });

  it('should follow the OS switching while no theme is picked', () => {
    const service = create(false);

    query.setPrefersDark(true);

    expect(service.theme()).toBe('dark');
  });

  it('should keep the theme the inline script already applied', () => {
    document.documentElement.dataset['theme'] = 'light';

    expect(create(true).theme()).toBe('light');
  });

  it('should switch, apply and remember the theme on toggle', () => {
    const service = create(false);

    service.toggle();

    expect(service.theme()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('should ignore the OS switching once a theme is picked', () => {
    const service = create(true);
    service.toggle();

    query.setPrefersDark(true);

    expect(service.theme()).toBe('light');
  });
});
