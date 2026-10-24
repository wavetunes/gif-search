import { Clipboard } from '@angular/cdk/clipboard';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import type { Observable } from 'rxjs';
import { NEVER, of, Subject, throwError } from 'rxjs';

import { GiphyApiService } from '../../core/api/giphy-api.service';
import { GifDownloadService } from '../../core/gif-download.service';
import { GiphyApiError } from '../../core/api/giphy-api.error';
import type { GifDetails } from '../../core/gif.model';
import { GifDetailsPageComponent } from './gif-details-page.component';

const FULL_DETAILS: GifDetails = {
  id: 'abc123',
  title: 'Dancing Cat GIF',
  altText: 'a cat dancing',
  url: 'https://media.giphy.com/abc123/giphy.gif',
  displayUrl: 'https://media.giphy.com/abc123/giphy.webp',
  width: 480,
  height: 360,
  author: { username: 'catlover', avatarUrl: 'https://media.giphy.com/avatars/catlover.jpg' },
  rating: 'pg',
  createdAt: new Date(2024, 2, 9),
  uploadedAt: new Date(2024, 2, 10),
};

describe('GifDetailsPageComponent', () => {
  let fixture: ComponentFixture<GifDetailsPageComponent>;
  let getById: ReturnType<typeof vi.fn<(id: string) => Observable<GifDetails>>>;
  let download: ReturnType<typeof vi.fn<(gif: GifDetails) => Observable<void>>>;
  let copy: ReturnType<typeof vi.fn<(text: string) => boolean>>;
  let open: ReturnType<typeof vi.fn<(message: string) => void>>;

  function element(testId: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);
  }

  async function createWithId(id: string): Promise<void> {
    fixture = TestBed.createComponent(GifDetailsPageComponent);
    fixture.componentRef.setInput('id', id);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    getById = vi.fn();
    download = vi.fn();
    copy = vi.fn();
    open = vi.fn();

    await TestBed.configureTestingModule({
      imports: [GifDetailsPageComponent],
      providers: [
        provideRouter([]),
        { provide: GiphyApiService, useValue: { getById } },
        { provide: GifDownloadService, useValue: { download } },
        { provide: Clipboard, useValue: { copy } },
        { provide: MatSnackBar, useValue: { open } },
      ],
    }).compileComponents();
  });

  it('should show the loading state while the request is in flight', async () => {
    getById.mockReturnValue(NEVER);

    fixture = TestBed.createComponent(GifDetailsPageComponent);
    fixture.componentRef.setInput('id', 'abc123');
    fixture.detectChanges();

    expect(getById).toHaveBeenCalledWith('abc123');
    expect(element('loading-state')).not.toBeNull();
    expect(element('back-button')).not.toBeNull();
  });

  it('should link back to the search it was opened from', async () => {
    getById.mockReturnValue(of(FULL_DETAILS));

    fixture = TestBed.createComponent(GifDetailsPageComponent);
    fixture.componentRef.setInput('id', 'abc123');
    fixture.componentRef.setInput('q', 'cat');
    await fixture.whenStable();

    expect(element('back-button')?.getAttribute('href')).toBe('/?q=cat');
  });

  it('should link back to the home page when opened without a query', async () => {
    getById.mockReturnValue(of(FULL_DETAILS));

    await createWithId('abc123');

    expect(element('back-button')?.getAttribute('href')).toBe('/');
  });

  it('should render every field the API returned', async () => {
    getById.mockReturnValue(of(FULL_DETAILS));

    await createWithId('abc123');

    const image = element('gif-image');
    expect(image?.getAttribute('src')).toBe(FULL_DETAILS.displayUrl);
    expect(image?.getAttribute('alt')).toBe('a cat dancing');
    expect(element('gif-title')?.textContent?.trim()).toBe('Dancing Cat GIF');
    expect(element('gif-author')?.textContent?.trim()).toBe('catlover');
    expect(element('gif-avatar')?.getAttribute('src')).toBe(FULL_DETAILS.author?.avatarUrl);
    expect(element('gif-created')?.textContent?.trim()).toBe('Mar 9, 2024');
    expect(element('gif-uploaded')?.textContent?.trim()).toBe('Mar 10, 2024');
    expect(element('gif-rating')?.textContent?.trim()).toBe('PG');
    expect(element('gif-dimensions')?.textContent?.trim()).toBe('480 × 360 px');
  });

  it('should omit the fields the API did not return', async () => {
    getById.mockReturnValue(
      of({
        ...FULL_DETAILS,
        title: undefined,
        author: undefined,
        rating: undefined,
        createdAt: undefined,
        uploadedAt: undefined,
      }),
    );

    await createWithId('abc123');

    expect(element('gif-image')).not.toBeNull();
    expect(element('gif-title')).toBeNull();
    expect(element('gif-author')).toBeNull();
    expect(element('gif-created')).toBeNull();
    expect(element('gif-uploaded')).toBeNull();
    expect(element('gif-rating')).toBeNull();
    expect(element('gif-dimensions')).not.toBeNull();
  });

  it('should show the not-found state when the id does not resolve', async () => {
    getById.mockReturnValue(throwError(() => new GiphyApiError('not-found')));

    await createWithId('does-not-exist');

    expect(element('not-found-message')?.textContent).toContain('GIF not found.');
    expect(element('retry-button')).toBeNull();
  });

  it('should show a retryable error when the request fails for another reason', async () => {
    getById
      .mockReturnValueOnce(throwError(() => new GiphyApiError('unknown')))
      .mockReturnValue(of(FULL_DETAILS));

    await createWithId('abc123');
    element('retry-button')?.click();
    await fixture.whenStable();

    expect(getById).toHaveBeenCalledTimes(2);
    expect(element('gif-details')).not.toBeNull();
  });

  it('should copy the gif link without the search query and confirm it', async () => {
    getById.mockReturnValue(of(FULL_DETAILS));
    copy.mockReturnValue(true);

    fixture = TestBed.createComponent(GifDetailsPageComponent);
    fixture.componentRef.setInput('id', 'abc123');
    fixture.componentRef.setInput('q', 'cat');
    await fixture.whenStable();
    element('copy-link-button')?.click();

    expect(copy).toHaveBeenCalledWith(new URL('gif/abc123', document.baseURI).href);
    expect(open).toHaveBeenCalledWith('Link copied', undefined, expect.anything());
  });

  it('should tell the user when copying fails', async () => {
    getById.mockReturnValue(of(FULL_DETAILS));
    copy.mockReturnValue(false);

    await createWithId('abc123');
    element('copy-link-button')?.click();

    expect(open).toHaveBeenCalledWith('Could not copy the link', undefined, expect.anything());
  });

  it('should keep the download button busy until the download finishes', async () => {
    getById.mockReturnValue(of(FULL_DETAILS));
    const result = new Subject<void>();
    download.mockReturnValue(result);

    await createWithId('abc123');
    element('download-button')?.click();
    fixture.detectChanges();

    element('download-button')?.click();

    expect(download).toHaveBeenCalledExactlyOnceWith(FULL_DETAILS);
    expect(element('download-button')?.getAttribute('aria-disabled')).toBe('true');

    result.next();
    result.complete();
    fixture.detectChanges();

    expect(element('download-button')?.hasAttribute('aria-disabled')).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });

  it('should re-enable the download button and tell the user when the download fails', async () => {
    getById.mockReturnValue(of(FULL_DETAILS));
    download.mockReturnValue(throwError(() => new Error('network')));

    await createWithId('abc123');
    element('download-button')?.click();
    fixture.detectChanges();

    expect(element('download-button')?.hasAttribute('aria-disabled')).toBe(false);
    expect(open).toHaveBeenCalledWith('Could not download the GIF', undefined, expect.anything());
  });
});
