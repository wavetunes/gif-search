export interface GiphyImageRaw {
  url: string;
  webp?: string;
  width: string;
  height: string;
}

export interface GiphyGifRaw {
  id: string;
  title: string;
  alt_text?: string;
  images: {
    fixed_width: GiphyImageRaw;
  };
}

export interface GiphyPaginationRaw {
  offset: number;
  total_count: number;
  count: number;
}

export interface GiphySearchResponseRaw {
  data: GiphyGifRaw[];
  pagination: GiphyPaginationRaw;
}

export interface GiphyUserRaw {
  username: string;
  avatar_url?: string;
}

export interface GiphyGifDetailsRaw {
  id: string;
  title: string;
  alt_text?: string;
  rating?: string;
  import_datetime?: string;
  create_datetime?: string | null;
  user?: GiphyUserRaw;
  images: {
    original: GiphyImageRaw;
  };
}

export interface GiphyGifDetailsResponseRaw {
  data: GiphyGifDetailsRaw;
}
