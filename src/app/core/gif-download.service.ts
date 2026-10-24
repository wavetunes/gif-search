import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import type { GifDetails } from './gif.model';

// eslint-disable-next-line no-control-regex
const INVALID_FILE_NAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

export function toGifFileName({ id, title }: Pick<GifDetails, 'id' | 'title'>): string {
  const name = (title ?? '').replace(INVALID_FILE_NAME_CHARS, '').trim().replace(/\s+/g, '-');
  return name ? `${name}-${id}.gif` : `${id}.gif`;
}

@Injectable({
  providedIn: 'root',
})
export class GifDownloadService {
  private readonly _http = inject(HttpClient);
  private readonly _document = inject(DOCUMENT);

  download(gif: GifDetails): Observable<void> {
    return this._http
      .get(gif.url, { responseType: 'blob' })
      .pipe(map((blob) => this._save(blob, toGifFileName(gif))));
  }

  private _save(blob: Blob, fileName: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const link = this._document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl));
  }
}
