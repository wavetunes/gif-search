import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { GifDetails, GifPage } from '../gif.model';
import { GIPHY_API_BASE_URL, GIPHY_API_KEY } from '../tokens';
import { GiphyApiError } from './giphy-api.error';
import type { GiphyGifDetailsResponseRaw, GiphySearchResponseRaw } from './giphy-api.model';
import { GIF_PAGE_SIZE, GiphyApiService } from './giphy-api.service';

const BASE_URL = 'https://api.giphy.com/v1';
const API_KEY = 'test-key';

const RESPONSE: GiphySearchResponseRaw = {
  data: [
    {
      id: 'abc123',
      title: 'Dancing Cat GIF',
      alt_text: 'a cat dancing',
      images: {
        fixed_width: {
          url: 'https://media.giphy.com/abc123/200w.gif',
          width: '200',
          height: '150',
        },
      },
    },
  ],
  pagination: { offset: 0, total_count: 500, count: 1 },
};

const DETAILS_RESPONSE: GiphyGifDetailsResponseRaw = {
  data: {
    id: 'abc123',
    title: 'Dancing Cat GIF',
    alt_text: 'a cat dancing',
    rating: 'g',
    import_datetime: '2024-03-09 00:35:13',
    images: {
      original: { url: 'https://media.giphy.com/abc123/giphy.gif', width: '480', height: '360' },
    },
  },
};

describe('GiphyApiService', () => {
  let service: GiphyApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GIPHY_API_KEY, useValue: API_KEY },
        { provide: GIPHY_API_BASE_URL, useValue: BASE_URL },
      ],
    });

    service = TestBed.inject(GiphyApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should request the search endpoint with the documented params', () => {
    service.search('cat', 24).subscribe();

    const request = httpMock.expectOne((req) => req.url === `${BASE_URL}/gifs/search`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('api_key')).toBe(API_KEY);
    expect(request.request.params.get('q')).toBe('cat');
    expect(request.request.params.get('limit')).toBe(String(GIF_PAGE_SIZE));
    expect(request.request.params.get('offset')).toBe('24');
    expect(request.request.params.get('rating')).toBe('pg-13');

    request.flush(RESPONSE);
  });

  it('should return the mapped page', () => {
    let page: GifPage | undefined;
    service.search('cat', 0).subscribe((value) => (page = value));

    httpMock
      .expectOne(`${BASE_URL}/gifs/search?api_key=${API_KEY}&q=cat&offset=0&limit=24&rating=pg-13`)
      .flush(RESPONSE);

    expect(page).toEqual({
      gifs: [
        {
          id: 'abc123',
          title: 'Dancing Cat GIF',
          altText: 'a cat dancing',
          preview: { url: 'https://media.giphy.com/abc123/200w.gif', width: 200, height: 150 },
        },
      ],
      offset: 0,
      totalCount: 500,
    });
  });

  it('should map a 429 response to a rate-limit error', () => {
    let error: unknown;
    service.search('cat', 0).subscribe({ error: (value: unknown) => (error = value) });

    httpMock
      .expectOne((req) => req.url === `${BASE_URL}/gifs/search`)
      .flush('Too Many Requests', { status: 429, statusText: 'Too Many Requests' });

    expect(error).toEqual(new GiphyApiError('rate-limit'));
  });

  it('should map any other failure to an unknown error', () => {
    let error: unknown;
    service.search('cat', 0).subscribe({ error: (value: unknown) => (error = value) });

    httpMock
      .expectOne((req) => req.url === `${BASE_URL}/gifs/search`)
      .flush('Server Error', { status: 500, statusText: 'Server Error' });

    expect(error).toEqual(new GiphyApiError('unknown'));
  });

  it('should request the trending endpoint without a query', () => {
    let page: GifPage | undefined;
    service.trending(24).subscribe((value) => (page = value));

    httpMock
      .expectOne(`${BASE_URL}/gifs/trending?api_key=${API_KEY}&offset=24&limit=24&rating=pg-13`)
      .flush(RESPONSE);

    expect(page?.gifs.map(({ id }) => id)).toEqual(['abc123']);
  });

  it('should map a 429 trending response to a rate-limit error', () => {
    let error: unknown;
    service.trending(0).subscribe({ error: (value: unknown) => (error = value) });

    httpMock
      .expectOne((req) => req.url === `${BASE_URL}/gifs/trending`)
      .flush('Too Many Requests', { status: 429, statusText: 'Too Many Requests' });

    expect(error).toEqual(new GiphyApiError('rate-limit'));
  });

  it('should request the gif-by-id endpoint with the api key', () => {
    service.getById('abc123').subscribe();

    const request = httpMock.expectOne((req) => req.url === `${BASE_URL}/gifs/abc123`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('api_key')).toBe(API_KEY);
    expect(request.request.params.keys()).toEqual(['api_key']);

    request.flush(DETAILS_RESPONSE);
  });

  it('should return the mapped gif details', () => {
    let details: GifDetails | undefined;
    service.getById('abc123').subscribe((value) => (details = value));

    httpMock.expectOne(`${BASE_URL}/gifs/abc123?api_key=${API_KEY}`).flush(DETAILS_RESPONSE);

    expect(details).toEqual({
      id: 'abc123',
      title: 'Dancing Cat GIF',
      altText: 'a cat dancing',
      url: 'https://media.giphy.com/abc123/giphy.gif',
      displayUrl: 'https://media.giphy.com/abc123/giphy.gif',
      width: 480,
      height: 360,
      author: undefined,
      rating: 'g',
      createdAt: undefined,
      uploadedAt: new Date(2024, 2, 9, 0, 35, 13),
    });
  });

  it.each([400, 404])('should map a %i response to a not-found error', (status) => {
    let error: unknown;
    service.getById('nope').subscribe({ error: (value: unknown) => (error = value) });

    httpMock
      .expectOne((req) => req.url === `${BASE_URL}/gifs/nope`)
      .flush({ data: [], meta: { status } }, { status, statusText: 'Error' });

    expect(error).toEqual(new GiphyApiError('not-found'));
  });

  it('should map a 429 gif-by-id response to a rate-limit error', () => {
    let error: unknown;
    service.getById('abc123').subscribe({ error: (value: unknown) => (error = value) });

    httpMock
      .expectOne((req) => req.url === `${BASE_URL}/gifs/abc123`)
      .flush('Too Many Requests', { status: 429, statusText: 'Too Many Requests' });

    expect(error).toEqual(new GiphyApiError('rate-limit'));
  });

  it('should let a malformed response fail as itself instead of a request error', () => {
    let error: unknown;
    service.search('cat', 0).subscribe({ error: (value: unknown) => (error = value) });

    httpMock.expectOne((req) => req.url === `${BASE_URL}/gifs/search`).flush({});

    expect(error).toBeInstanceOf(TypeError);
  });

  it('should map any other gif-by-id failure to an unknown error', () => {
    let error: unknown;
    service.getById('abc123').subscribe({ error: (value: unknown) => (error = value) });

    httpMock
      .expectOne((req) => req.url === `${BASE_URL}/gifs/abc123`)
      .flush('Server Error', { status: 500, statusText: 'Server Error' });

    expect(error).toEqual(new GiphyApiError('unknown'));
  });
});
