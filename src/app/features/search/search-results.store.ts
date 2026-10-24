import { Injectable } from '@angular/core';

import type { Gif } from '../../core/gif.model';

export interface SearchResultsSnapshot {
  readonly query: string;
  readonly gifs: readonly Gif[];
  readonly totalCount: number;
  readonly offset: number;
  readonly scrollY: number;
}

@Injectable({
  providedIn: 'root',
})
export class SearchResultsStore {
  snapshot: SearchResultsSnapshot | undefined;
}
