import { ViewportScroller } from '@angular/common';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { Observable } from 'rxjs';
import { of, throwError } from 'rxjs';

import { GiphyApiService } from '../../core/api/giphy-api.service';
import { GiphyApiError } from '../../core/api/giphy-api.error';
import type { Gif, GifPage } from '../../core/gif.model';
import { SearchPageComponent } from './search-page.component';
import { SearchResultsStore } from './search-results.store';

function gif(id: string): Gif {
  return {
    id,
    title: `GIF ${id}`,
    altText: `GIF ${id}`,
    preview: { url: `https://media.giphy.com/${id}/200w.gif`, width: 200, height: 150 },
  };
}

function page(gifs: readonly Gif[], offset: number, totalCount: number): GifPage {
  return { gifs, offset, totalCount };
}

describe('SearchPageComponent', () => {
  let fixture: ComponentFixture<SearchPageComponent>;
  let search: ReturnType<typeof vi.fn<(query: string, offset: number) => Observable<GifPage>>>;
  let trending: ReturnType<typeof vi.fn<(offset: number) => Observable<GifPage>>>;
  let scrollToPosition: ReturnType<typeof vi.fn<(position: [number, number]) => void>>;

  function element(testId: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);
  }

  async function createWithQuery(q: string): Promise<void> {
    fixture = TestBed.createComponent(SearchPageComponent);
    fixture.componentRef.setInput('q', q);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    search = vi.fn();
    trending = vi.fn(() => of(page([], 0, 0)));
    scrollToPosition = vi.fn();

    await TestBed.configureTestingModule({
      imports: [SearchPageComponent],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: GiphyApiService, useValue: { search, trending } },
        {
          provide: ViewportScroller,
          useValue: { scrollToPosition, getScrollPosition: () => [0, 640] },
        },
      ],
    }).compileComponents();
  });

  it('should show trending gifs without a query', async () => {
    trending.mockReturnValue(of(page([gif('a'), gif('b')], 0, 2)));

    await createWithQuery('');

    expect(search).not.toHaveBeenCalled();
    expect(trending).toHaveBeenCalledWith(0);
    expect(fixture.nativeElement.querySelectorAll('[data-testid="gif-grid"] img').length).toBe(2);
    expect(element('results-title')?.textContent?.trim()).toBe('Trending now');
    expect(element('result-count')).toBeNull();
    expect(element('gif-link')?.getAttribute('href')).toBe('/gif/a');
  });

  it('should switch from trending to search results once a query is set', async () => {
    trending.mockReturnValue(of(page([gif('a')], 0, 1)));
    search.mockReturnValue(of(page([gif('b'), gif('c')], 0, 2)));

    await createWithQuery('');
    fixture.componentRef.setInput('q', 'cat');
    await fixture.whenStable();

    expect(search).toHaveBeenCalledWith('cat', 0);
    expect(fixture.nativeElement.querySelectorAll('[data-testid="gif-grid"] img').length).toBe(2);
    expect(element('result-count')?.textContent?.trim()).toBe('2 of 2 results');
  });

  it('should navigate with the typed query when the form is submitted', async () => {
    await createWithQuery('');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const root: HTMLElement = fixture.nativeElement;
    const input = root.querySelector<HTMLInputElement>('[data-testid="search-input"]');
    if (!input) throw new Error('The search input is not rendered.');

    input.value = 'cat';
    input.dispatchEvent(new Event('input'));
    element('search-submit')?.click();
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: { q: 'cat' },
    });
  });

  it('should render the results of the query in a grid', async () => {
    search.mockReturnValue(of(page([gif('a'), gif('b')], 0, 2)));

    await createWithQuery('cat');

    expect(search).toHaveBeenCalledWith('cat', 0);
    expect(fixture.nativeElement.querySelectorAll('[data-testid="gif-grid"] img').length).toBe(2);
    expect(element('result-count')?.textContent?.trim()).toBe('2 of 2 results');
  });

  it('should link each card to the details page of its gif', async () => {
    search.mockReturnValue(of(page([gif('abc123')], 0, 1)));

    await createWithQuery('cat');

    expect(element('gif-link')?.getAttribute('href')).toBe('/gif/abc123?q=cat');
  });

  it('should render the empty state when the API returns no gifs', async () => {
    search.mockReturnValue(of(page([], 0, 0)));

    await createWithQuery('qqzzxx');

    expect(element('empty-state')?.textContent).toContain('No GIFs found');
    expect(element('result-count')?.textContent?.trim()).toBe('0 results');
  });

  it('should render the error state and refire the request on retry', async () => {
    search.mockReturnValue(throwError(() => new GiphyApiError('unknown')));

    await createWithQuery('cat');

    expect(element('error-state')).not.toBeNull();

    search.mockReturnValue(of(page([gif('a')], 0, 1)));
    element('retry-button')?.click();
    await fixture.whenStable();

    expect(search).toHaveBeenCalledTimes(2);
    expect(element('error-state')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('[data-testid="gif-grid"] img').length).toBe(1);
  });

  it('should drop the previous results when a new query fails on its first page', async () => {
    search.mockReturnValue(of(page([gif('a'), gif('b')], 0, 2)));

    await createWithQuery('cat');

    expect(element('gif-grid')).not.toBeNull();

    search.mockReturnValue(throwError(() => new GiphyApiError('rate-limit')));
    fixture.componentRef.setInput('q', 'dog');
    await fixture.whenStable();

    expect(element('error-state')?.textContent).toContain('request limit');
    expect(element('gif-grid')).toBeNull();
    expect(element('load-more-error')).toBeNull();
  });

  it('should keep the loaded grid and resume at the same offset when loading more fails', async () => {
    search.mockReturnValue(of(page([gif('a'), gif('b')], 0, 3)));

    await createWithQuery('cat');

    search.mockReturnValue(throwError(() => new GiphyApiError('rate-limit')));
    element('load-more-button')?.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('[data-testid="gif-grid"] img').length).toBe(2);
    expect(element('load-more-error')?.textContent).toContain('request limit');
    expect(element('error-state')).toBeNull();

    search.mockReturnValue(of(page([gif('c')], 2, 3)));
    element('retry-button')?.click();
    await fixture.whenStable();

    expect(search).toHaveBeenLastCalledWith('cat', 2);
    expect(fixture.nativeElement.querySelectorAll('[data-testid="gif-grid"] img').length).toBe(3);
    expect(element('load-more-error')).toBeNull();
  });

  it('should append the next page and hide the button once everything is loaded', async () => {
    search.mockReturnValue(of(page([gif('a'), gif('b')], 0, 3)));

    await createWithQuery('cat');

    expect(element('load-more-button')).not.toBeNull();

    search.mockReturnValue(of(page([gif('c')], 2, 3)));
    element('load-more-button')?.click();
    await fixture.whenStable();

    expect(search).toHaveBeenLastCalledWith('cat', 2);
    expect(fixture.nativeElement.querySelectorAll('[data-testid="gif-grid"] img').length).toBe(3);
    expect(element('load-more-button')).toBeNull();
  });

  it('should leave its results and scroll position behind when navigated away from', async () => {
    search.mockReturnValue(of(page([gif('a'), gif('b')], 0, 3)));

    await createWithQuery('cat');
    await TestBed.inject(Router).navigateByUrl('/gif/a');
    fixture.destroy();

    expect(TestBed.inject(SearchResultsStore).snapshot).toEqual({
      query: 'cat',
      gifs: [gif('a'), gif('b')],
      totalCount: 3,
      offset: 0,
      scrollY: 640,
    });
  });

  it('should restore the left-behind results and scroll when coming back to the same query', async () => {
    TestBed.inject(SearchResultsStore).snapshot = {
      query: 'cat',
      gifs: [gif('a'), gif('b'), gif('c')],
      totalCount: 4,
      offset: 2,
      scrollY: 640,
    };
    search.mockReturnValue(of(page([gif('c')], 2, 4)));

    await createWithQuery('cat');

    expect(search).toHaveBeenCalledExactlyOnceWith('cat', 2);
    expect(fixture.nativeElement.querySelectorAll('[data-testid="gif-grid"] img').length).toBe(3);
    expect(element('load-more-button')).not.toBeNull();
    expect(scrollToPosition).toHaveBeenCalledWith([0, 640]);
  });

  it('should ignore left-behind results of another query', async () => {
    TestBed.inject(SearchResultsStore).snapshot = {
      query: 'dog',
      gifs: [gif('a')],
      totalCount: 1,
      offset: 0,
      scrollY: 640,
    };
    search.mockReturnValue(of(page([gif('b')], 0, 1)));

    await createWithQuery('cat');

    expect(search).toHaveBeenCalledExactlyOnceWith('cat', 0);
    expect(element('gif-link')?.getAttribute('href')).toBe('/gif/b?q=cat');
    expect(scrollToPosition).not.toHaveBeenCalled();
  });
});
