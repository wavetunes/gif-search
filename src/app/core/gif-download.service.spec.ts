import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { GifDownloadService, toGifFileName } from './gif-download.service';
import type { GifDetails } from './gif.model';

const GIF: GifDetails = {
  id: 'abc123',
  title: 'Dancing Cat GIF',
  altText: 'a cat dancing',
  url: 'https://media.giphy.com/abc123/giphy.gif',
  displayUrl: 'https://media.giphy.com/abc123/giphy.webp',
  width: 480,
  height: 360,
};

describe('toGifFileName', () => {
  it.each([
    ['Dancing Cat GIF', 'Dancing-Cat-GIF-abc123.gif'],
    ['  What? A/B: "test" <1> | 2 * 3\\  ', 'What-AB-test-1-2-3-abc123.gif'],
    ['???', 'abc123.gif'],
    [undefined, 'abc123.gif'],
  ])('should turn the title %j into %j', (title, expected) => {
    expect(toGifFileName({ id: 'abc123', title })).toBe(expected);
  });
});

describe('GifDownloadService', () => {
  let service: GifDownloadService;
  let httpMock: HttpTestingController;
  let link: HTMLAnchorElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(GifDownloadService);
    httpMock = TestBed.inject(HttpTestingController);

    link = document.createElement('a');
    vi.spyOn(link, 'click').mockImplementation(() => undefined);
    vi.spyOn(document, 'createElement').mockReturnValue(link);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:gif');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('should request the gif media as a blob', () => {
    service.download(GIF).subscribe();

    const request = httpMock.expectOne(GIF.url);
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');

    request.flush(new Blob());
  });

  it('should save the blob under the gif file name and release it afterwards', async () => {
    const blob = new Blob(['gif'], { type: 'image/gif' });
    let isDone = false;
    service.download(GIF).subscribe(() => (isDone = true));

    httpMock.expectOne(GIF.url).flush(blob);

    expect(isDone).toBe(true);
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(link.href).toBe('blob:gif');
    expect(link.download).toBe('Dancing-Cat-GIF-abc123.gif');
    expect(link.click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:gif'));
  });

  it('should error and save nothing when the request fails', () => {
    let isFailed = false;
    service.download(GIF).subscribe({ error: () => (isFailed = true) });

    httpMock.expectOne(GIF.url).error(new ProgressEvent('error'));

    expect(isFailed).toBe(true);
    expect(link.click).not.toHaveBeenCalled();
  });
});
