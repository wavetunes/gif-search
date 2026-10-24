import { toGifDetails, toGifPage } from './giphy-api.mapper';
import type { GiphyGifDetailsRaw, GiphyGifRaw, GiphySearchResponseRaw } from './giphy-api.model';

function rawGif(overrides: Partial<GiphyGifRaw> = {}): GiphyGifRaw {
  return {
    id: 'abc123',
    title: 'Dancing Cat GIF',
    alt_text: 'a cat dancing',
    images: {
      fixed_width: { url: 'https://media.giphy.com/abc123/200w.gif', width: '200', height: '150' },
    },
    ...overrides,
  };
}

function rawResponse(
  data: GiphyGifRaw[],
  totalCount = data.length,
  offset = 0,
): GiphySearchResponseRaw {
  return { data, pagination: { offset, total_count: totalCount, count: data.length } };
}

describe('toGifPage', () => {
  it('should map a full gif object to the app model', () => {
    const page = toGifPage(rawResponse([rawGif()], 500, 24));

    expect(page).toEqual({
      gifs: [
        {
          id: 'abc123',
          title: 'Dancing Cat GIF',
          altText: 'a cat dancing',
          preview: {
            url: 'https://media.giphy.com/abc123/200w.gif',
            width: 200,
            height: 150,
          },
        },
      ],
      offset: 24,
      totalCount: 500,
    });
  });

  it('should show the WebP rendition when Giphy has one', () => {
    const page = toGifPage(
      rawResponse([
        rawGif({
          images: {
            fixed_width: {
              url: 'https://media.giphy.com/abc123/200w.gif',
              webp: 'https://media.giphy.com/abc123/200w.webp',
              width: '200',
              height: '150',
            },
          },
        }),
      ]),
    );

    expect(page.gifs[0].preview.url).toBe('https://media.giphy.com/abc123/200w.webp');
  });

  it('should fall back to the title when alt_text is missing', () => {
    const page = toGifPage(rawResponse([rawGif({ alt_text: undefined })]));

    expect(page.gifs[0].altText).toBe('Dancing Cat GIF');
  });

  it('should fall back to the title when alt_text is empty', () => {
    const page = toGifPage(rawResponse([rawGif({ alt_text: '' })]));

    expect(page.gifs[0].altText).toBe('Dancing Cat GIF');
  });

  it('should fall back to GIF when both alt_text and title are empty', () => {
    const page = toGifPage(rawResponse([rawGif({ alt_text: '  ', title: '' })]));

    expect(page.gifs[0].altText).toBe('GIF');
  });

  it('should convert the string dimensions to numbers', () => {
    const page = toGifPage(rawResponse([rawGif()]));

    expect(page.gifs[0].preview.width).toBe(200);
    expect(page.gifs[0].preview.height).toBe(150);
  });

  it('should map an empty result to an empty page', () => {
    const page = toGifPage(rawResponse([], 0));

    expect(page).toEqual({ gifs: [], offset: 0, totalCount: 0 });
  });
});

function rawGifDetails(overrides: Partial<GiphyGifDetailsRaw> = {}): GiphyGifDetailsRaw {
  return {
    id: 'abc123',
    title: 'Dancing Cat GIF',
    alt_text: 'a cat dancing',
    rating: 'pg',
    import_datetime: '2024-03-09 00:35:13',
    create_datetime: null,
    user: { username: 'catlover', avatar_url: 'https://media.giphy.com/avatars/catlover.jpg' },
    images: {
      original: {
        url: 'https://media.giphy.com/abc123/giphy.gif',
        webp: 'https://media.giphy.com/abc123/giphy.webp',
        width: '480',
        height: '360',
      },
    },
    ...overrides,
  };
}

describe('toGifDetails', () => {
  it('should map a full gif object to the app model', () => {
    expect(toGifDetails(rawGifDetails({ create_datetime: '2024-03-08 10:00:00' }))).toEqual({
      id: 'abc123',
      title: 'Dancing Cat GIF',
      altText: 'a cat dancing',
      url: 'https://media.giphy.com/abc123/giphy.gif',
      displayUrl: 'https://media.giphy.com/abc123/giphy.webp',
      width: 480,
      height: 360,
      author: { username: 'catlover', avatarUrl: 'https://media.giphy.com/avatars/catlover.jpg' },
      rating: 'pg',
      createdAt: new Date(2024, 2, 8, 10, 0, 0),
      uploadedAt: new Date(2024, 2, 9, 0, 35, 13),
    });
  });

  it('should omit every optional field Giphy did not return', () => {
    const details = toGifDetails({
      id: 'abc123',
      title: '',
      images: {
        original: { url: 'https://media.giphy.com/abc123/giphy.gif', width: '480', height: '360' },
      },
    });

    expect(details).toEqual({
      id: 'abc123',
      title: undefined,
      altText: 'GIF',
      url: 'https://media.giphy.com/abc123/giphy.gif',
      displayUrl: 'https://media.giphy.com/abc123/giphy.gif',
      width: 480,
      height: 360,
      author: undefined,
      rating: undefined,
      createdAt: undefined,
      uploadedAt: undefined,
    });
  });

  it('should return undefined avatar when the user has no avatar_url', () => {
    const details = toGifDetails(rawGifDetails({ user: { username: 'catlover', avatar_url: '' } }));

    expect(details.author).toEqual({ username: 'catlover', avatarUrl: undefined });
  });

  it('should keep the creation date when the upload date is the placeholder', () => {
    const details = toGifDetails(
      rawGifDetails({
        import_datetime: '0000-00-00 00:00:00',
        create_datetime: '2020-10-02 12:29:12',
      }),
    );

    expect(details.createdAt).toEqual(new Date(2020, 9, 2, 12, 29, 12));
    expect(details.uploadedAt).toBeUndefined();
  });

  it('should return undefined dates when both are unknown', () => {
    const details = toGifDetails(
      rawGifDetails({ import_datetime: '0000-00-00 00:00:00', create_datetime: '' }),
    );

    expect(details.createdAt).toBeUndefined();
    expect(details.uploadedAt).toBeUndefined();
  });

  it('should fall back to the title when alt_text is empty', () => {
    const details = toGifDetails(rawGifDetails({ alt_text: '' }));

    expect(details.altText).toBe('Dancing Cat GIF');
  });
});
