import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { RouterLink, RouterOutlet } from '@angular/router';

import { ThemeService } from './core/theme.service';
import { IconComponent } from './shared/icon.component';

@Component({
  selector: 'app-root',
  imports: [IconComponent, MatIconButton, RouterLink, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly _themeService = inject(ThemeService);

  protected readonly theme = this._themeService.theme;

  protected onToggleTheme(): void {
    this._themeService.toggle();
  }
}
