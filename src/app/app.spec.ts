import { MediaMatcher } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { THEME_STORAGE_KEY } from './core/theme.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: MediaMatcher,
          useValue: {
            matchMedia: () => ({
              matches: false,
              addEventListener: () => undefined,
              removeEventListener: () => undefined,
            }),
          },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    delete document.documentElement.dataset['theme'];
    localStorage.removeItem(THEME_STORAGE_KEY);
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should toggle the theme from the header', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-testid="theme-toggle"]',
    );
    expect(toggle.getAttribute('aria-label')).toBe('Switch to dark theme');

    toggle.click();
    await fixture.whenStable();

    expect(toggle.getAttribute('aria-label')).toBe('Switch to light theme');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });
});
