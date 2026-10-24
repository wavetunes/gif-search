import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const ICON_PATHS = {
  'alert-circle': ['M12 8v4', 'M12 16h.01', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z'],
  'arrow-left': ['M19 12H5', 'M12 19l-7-7 7-7'],
  download: ['M12 4v11', 'M7 10l5 5 5-5', 'M5 20h14'],
  link: [
    'M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5',
    'M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5',
  ],
  moon: ['M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'],
  search: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M20 20l-3.5-3.5'],
  'search-x': ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M20 20l-3.5-3.5', 'M9 9l4 4', 'M13 9l-4 4'],
  sun: [
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    'M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41',
  ],
  trending: ['M3 17l6-6 4 4 8-8', 'M15 7h6v6'],
} as const;

export type IconName = keyof typeof ICON_PATHS;

@Component({
  selector: 'app-icon',
  template: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      @for (path of paths(); track $index) {
        <path [attr.d]="path" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
      inline-size: var(--app-icon-size, 1.25rem);
      block-size: var(--app-icon-size, 1.25rem);
    }

    svg {
      inline-size: 100%;
      block-size: 100%;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  readonly name = input.required<IconName>();

  protected readonly paths = computed(() => ICON_PATHS[this.name()]);
}
