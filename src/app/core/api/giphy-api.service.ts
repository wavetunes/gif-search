import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';

import type { GifDetails, GifDetailsErrorKind, GifPage, GifSearchErrorKind } from '../gif.model';
import { GIPHY_API_BASE_URL, GIPHY_API_KEY } from '../tokens';
import { GiphyApiError } from './giphy-api.error';
import { toGifDetails, toGifPage } from './giphy-api.mapper';
import type { GiphyGifDetailsResponseRaw, GiphySearchResponseRaw } from './giphy-api.model';

export const GIF_PAGE_SIZE = 24;

export const GIF_MAX_OFFSET = 4999;

const CONTENT_RATING = 'pg-13';

function toGifDetailsErrorKind(status: number): GifDetailsErrorKind {
  if (status === 400 || status === 404) return 'not-found';
  return status === 429 ? 'rate-limit' : 'unknown';
}

@Injectable({
  providedIn: 'root',
})
export class GiphyApiService {
  private readonly _http = inject(HttpClient);
  private readonly _apiKey = inject(GIPHY_API_KEY);
  private readonly _baseUrl = inject(GIPHY_API_BASE_URL);

  search(query: string, offset: number): Observable<GifPage> {
    return this._getPage('search', { q: query, offset });
  }

  trending(offset: number): Observable<GifPage> {
    return this._getPage('trending', { offset });
  }

  getById(id: string): Observable<GifDetails> {
    const params = new HttpParams({ fromObject: { api_key: this._apiKey } });

    return this._http
      .get<GiphyGifDetailsResponseRaw>(`${this._baseUrl}/gifs/${encodeURIComponent(id)}`, {
        params,
      })
      .pipe(
        catchError((error: HttpErrorResponse) =>
          throwError(() => new GiphyApiError(toGifDetailsErrorKind(error.status))),
        ),
        map(({ data }) => toGifDetails(data)),
      );
  }

  private _getPage(
    endpoint: 'search' | 'trending',
    params: { q?: string; offset: number },
  ): Observable<GifPage> {
    const httpParams = new HttpParams({
      fromObject: {
        api_key: this._apiKey,
        ...params,
        limit: GIF_PAGE_SIZE,
        rating: CONTENT_RATING,
      },
    });

    return this._http
      .get<GiphySearchResponseRaw>(`${this._baseUrl}/gifs/${endpoint}`, { params: httpParams })
      .pipe(
        catchError((error: HttpErrorResponse) =>
          throwError(
            () =>
              new GiphyApiError<GifSearchErrorKind>(
                error.status === 429 ? 'rate-limit' : 'unknown',
              ),
          ),
        ),
        map(toGifPage),
      );
  }
}
