import { Clipboard } from '@angular/cdk/clipboard';
import { DatePipe, DOCUMENT, UpperCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';

import { GiphyApiService } from '../../core/api/giphy-api.service';
import { GifDownloadService } from '../../core/gif-download.service';
import type { GifDetails, GifDetailsErrorKind } from '../../core/gif.model';
import { toErrorKind } from '../../core/resource-error';
import { RATE_LIMIT_MESSAGE } from '../../shared/error-messages';
import { IconComponent } from '../../shared/icon.component';

const ERROR_MESSAGES: Record<GifDetailsErrorKind, string> = {
  'not-found': 'GIF not found.',
  'rate-limit': RATE_LIMIT_MESSAGE,
  unknown: 'Could not load the GIF. Please try again.',
};

const SNACK_BAR_DURATION_MS = 3000;

@Component({
  selector: 'app-gif-details-page',
  imports: [DatePipe, IconComponent, MatButton, RouterLink, UpperCasePipe],
  templateUrl: './gif-details-page.component.html',
  styleUrl: './gif-details-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GifDetailsPageComponent {
  private readonly _api = inject(GiphyApiService);
  private readonly _downloader = inject(GifDownloadService);
  private readonly _clipboard = inject(Clipboard);
  private readonly _snackBar = inject(MatSnackBar);
  private readonly _document = inject(DOCUMENT);
  private readonly _destroyRef = inject(DestroyRef);

  protected readonly id = input.required<string>();
  protected readonly q = input('', { transform: (value: string | undefined) => value ?? '' });

  protected readonly backQueryParams = computed(() => (this.q().trim() ? { q: this.q() } : null));

  protected readonly gif = rxResource({
    params: () => ({ id: this.id() }),
    stream: ({ params }) => this._api.getById(params.id),
  });

  protected readonly errorKind = computed(() => {
    const error = this.gif.error();
    return error ? toErrorKind<GifDetailsErrorKind>(error) : undefined;
  });

  protected readonly isDownloading = signal(false);

  protected readonly errorMessages = ERROR_MESSAGES;

  protected onRetry(): void {
    this.gif.reload();
  }

  protected onCopyLink(details: GifDetails): void {
    const link = new URL(`gif/${encodeURIComponent(details.id)}`, this._document.baseURI).href;
    const isCopied = this._clipboard.copy(link);
    this._notify(isCopied ? 'Link copied' : 'Could not copy the link');
  }

  protected onDownload(details: GifDetails): void {
    if (this.isDownloading()) return;

    this.isDownloading.set(true);
    this._downloader
      .download(details)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        complete: () => this.isDownloading.set(false),
        error: () => {
          this.isDownloading.set(false);
          this._notify('Could not download the GIF');
        },
      });
  }

  private _notify(message: string): void {
    this._snackBar.open(message, undefined, { duration: SNACK_BAR_DURATION_MS });
  }
}
