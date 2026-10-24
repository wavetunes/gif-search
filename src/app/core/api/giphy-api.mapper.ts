import type { Gif, GifDetails, GifPage } from '../gif.model';
import type { GiphyGifDetailsRaw, GiphyGifRaw, GiphySearchResponseRaw } from './giphy-api.model';

const UNKNOWN_DATETIME = '0000-00-00 00:00:00';

function toGif(raw: GiphyGifRaw): Gif {
  const fixedWidth = raw.images.fixed_width;

  return {
    id: raw.id,
    title: raw.title,
    altText: raw.alt_text?.trim() || raw.title.trim() || 'GIF',
    preview: {
      url: fixedWidth.webp || fixedWidth.url,
      width: Number(fixedWidth.width),
      height: Number(fixedWidth.height),
    },
  };
}

function toDate(raw: string | null | undefined): Date | undefined {
  if (!raw || raw === UNKNOWN_DATETIME) return undefined;
  return new Date(raw.replace(' ', 'T'));
}

export function toGifPage(raw: GiphySearchResponseRaw): GifPage {
  return {
    gifs: raw.data.map(toGif),
    offset: raw.pagination.offset,
    totalCount: raw.pagination.total_count,
  };
}

export function toGifDetails(raw: GiphyGifDetailsRaw): GifDetails {
  const title = raw.title.trim();
  const original = raw.images.original;

  return {
    id: raw.id,
    title: title || undefined,
    altText: raw.alt_text?.trim() || title || 'GIF',
    url: original.url,
    displayUrl: original.webp || original.url,
    width: Number(original.width),
    height: Number(original.height),
    author: raw.user
      ? { username: raw.user.username, avatarUrl: raw.user.avatar_url || undefined }
      : undefined,
    rating: raw.rating || undefined,
    createdAt: toDate(raw.create_datetime),
    uploadedAt: toDate(raw.import_datetime),
  };
}
