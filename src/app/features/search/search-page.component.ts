import { BreakpointObserver } from '@angular/cdk/layout';
import { DecimalPipe, ViewportScroller } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatPrefix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { ActivatedRoute, NavigationStart, Router, RouterLink } from '@angular/router';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';

import { GIF_MAX_OFFSET, GiphyApiService } from '../../core/api/giphy-api.service';
import type { Gif, GifPage, GifSearchErrorKind } from '../../core/gif.model';
import { toErrorKind } from '../../core/resource-error';
import { RATE_LIMIT_MESSAGE } from '../../shared/error-messages';
import { IconComponent } from '../../shared/icon.component';
import { layoutGifMasonry } from './gif-masonry.layout';
import { SearchResultsStore } from './search-results.store';

const EAGER_IMAGE_COUNT = 6;

const COLUMN_BREAKPOINTS = [
  { query: '(width >= 1200px)', columnCount: 5 },
  { query: '(width >= 840px)', columnCount: 4 },
  { query: '(width > 600px)', columnCount: 3 },
] as const;

const MIN_COLUMN_COUNT = 2;

const SKELETON_ITEM_COUNT = 15;

const ERROR_MESSAGES: Record<GifSearchErrorKind, string> = {
  'rate-limit': RATE_LIMIT_MESSAGE,
  unknown: 'Could not load GIFs. Please try again.',
};

interface SearchResults {
  readonly query: string;
  readonly gifs: readonly Gif[];
  readonly totalCount: number;
}

function emptyResults(query: string): SearchResults {
  return { query, gifs: [], totalCount: 0 };
}

@Component({
  selector: 'app-search-page',
  imports: [
    DecimalPipe,
    IconComponent,
    MatButton,
    MatFormField,
    MatInput,
    MatPrefix,
    MatProgressSpinner,
    RouterLink,
  ],
  templateUrl: './search-page.component.html',
  styleUrl: './search-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchPageComponent {
  private readonly _api = inject(GiphyApiService);
  private readonly _router = inject(Router);
  private readonly _route = inject(ActivatedRoute);
  private readonly _breakpointObserver = inject(BreakpointObserver);
  private readonly _viewportScroller = inject(ViewportScroller);
  private readonly _store = inject(SearchResultsStore);

  private readonly _snapshot = this._store.snapshot;

  private readonly _searchInput = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');

  protected readonly q = input('', { transform: (value: string | undefined) => value ?? '' });

  protected readonly query = computed(() => this.q().trim());

  private readonly _offset = linkedSignal<string, number>({
    source: this.query,
    computation: (query, previous) =>
      !previous && query === this._snapshot?.query ? this._snapshot.offset : 0,
  });

  private readonly _page = rxResource({
    params: () => ({ query: this.query(), offset: this._offset() }),
    stream: ({ params: { query, offset } }) =>
      query ? this._api.search(query, offset) : this._api.trending(offset),
  });

  private readonly _nextOffset = computed(() => {
    if (!this._page.hasValue()) return 0;
    const page = this._page.value();
    return page.offset + page.gifs.length;
  });

  private readonly _results = linkedSignal<
    { query: string; page: GifPage | undefined },
    SearchResults
  >({
    source: () => ({
      query: this.query(),
      page: this._page.hasValue() ? this._page.value() : undefined,
    }),
    computation: ({ query, page }, previous) => {
      let loaded = previous ? previous.value : this._restoredResults(query);
      if (loaded.query !== query) loaded = emptyResults(query);
      if (!page) return loaded;
      if (page.offset === 0) return { query, gifs: page.gifs, totalCount: page.totalCount };

      const loadedIds = new Set(loaded.gifs.map((gif) => gif.id));
      return {
        query,
        gifs: [...loaded.gifs, ...page.gifs.filter((gif) => !loadedIds.has(gif.id))],
        totalCount: page.totalCount,
      };
    },
  });

  protected readonly eagerImageCount = EAGER_IMAGE_COUNT;

  protected readonly skeletonItems = Array.from({ length: SKELETON_ITEM_COUNT });

  protected readonly gifs = computed(() => this._results().gifs);

  protected readonly totalCount = computed(() => this._results().totalCount);

  protected readonly columnCount = toSignal(
    this._breakpointObserver
      .observe(COLUMN_BREAKPOINTS.map(({ query }) => query))
      .pipe(
        map(
          ({ breakpoints }) =>
            COLUMN_BREAKPOINTS.find(({ query }) => breakpoints[query])?.columnCount ??
            MIN_COLUMN_COUNT,
        ),
      ),
    { requireSync: true },
  );

  private readonly _measuredRatios = signal<ReadonlyMap<string, number>>(new Map());

  protected readonly gifLayout = computed(() =>
    layoutGifMasonry(this.gifs(), this.columnCount(), this._measuredRatios()),
  );

  protected readonly isFirstPageLoading = computed(
    () => this._page.isLoading() && this.gifs().length === 0,
  );

  protected readonly isLoadingMore = computed(
    () => this._page.isLoading() && this.gifs().length > 0,
  );

  protected readonly isFirstPageError = computed(
    () => !!this._page.error() && this.gifs().length === 0,
  );

  protected readonly errorMessage = computed(() => {
    const error = this._page.error();
    return error ? ERROR_MESSAGES[toErrorKind<GifSearchErrorKind>(error)] : undefined;
  });

  protected readonly hasMore = computed(() => {
    if (!this._page.hasValue() || this._page.value().gifs.length === 0) return false;
    const nextOffset = this._nextOffset();
    return nextOffset < this._page.value().totalCount && nextOffset <= GIF_MAX_OFFSET;
  });

  private _scrollYOnLeave = 0;

  constructor() {
    this._router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => (this._scrollYOnLeave = this._viewportScroller.getScrollPosition()[1]));

    afterNextRender(() => {
      if (this._snapshot && this.query() === this._snapshot.query) {
        this._viewportScroller.scrollToPosition([0, this._snapshot.scrollY]);
      }
    });

    inject(DestroyRef).onDestroy(() => {
      const { query, gifs, totalCount } = this._results();
      this._store.snapshot = gifs.length
        ? {
            query,
            gifs,
            totalCount,
            offset: this._offset(),
            scrollY: this._scrollYOnLeave,
          }
        : undefined;
    });
  }

  protected onSubmit(): void {
    const query = this._searchInput().nativeElement.value.trim();
    void this._router.navigate([], {
      relativeTo: this._route,
      queryParams: { q: query || null },
    });
  }

  protected onLoadMore(): void {
    if (this._page.isLoading()) return;
    this._offset.set(this._nextOffset());
  }

  protected onImageLoad(gif: Gif, image: HTMLImageElement): void {
    const ratio = image.naturalHeight / image.naturalWidth;
    if (ratio === gif.preview.height / gif.preview.width) return;
    this._measuredRatios.update((ratios) => new Map(ratios).set(gif.id, ratio));
  }

  protected onRetry(): void {
    this._page.reload();
  }

  private _restoredResults(query: string): SearchResults {
    const snapshot = this._snapshot;
    return snapshot?.query === query
      ? { query, gifs: snapshot.gifs, totalCount: snapshot.totalCount }
      : emptyResults(query);
  }
}
