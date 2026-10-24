export interface GifPreview {
  readonly url: string;
  readonly width: number;
  readonly height: number;
}

export interface Gif {
  readonly id: string;
  readonly title: string;
  readonly altText: string;
  readonly preview: GifPreview;
}

export interface GifPage {
  readonly gifs: readonly Gif[];
  readonly offset: number;
  readonly totalCount: number;
}

export type GifSearchErrorKind = 'rate-limit' | 'unknown';

export interface GifAuthor {
  readonly username: string;
  readonly avatarUrl?: string;
}

export interface GifDetails {
  readonly id: string;
  readonly title?: string;
  readonly altText: string;
  readonly url: string;
  readonly displayUrl: string;
  readonly width: number;
  readonly height: number;
  readonly author?: GifAuthor;
  readonly rating?: string;
  readonly createdAt?: Date;
  readonly uploadedAt?: Date;
}

export type GifDetailsErrorKind = 'not-found' | GifSearchErrorKind;
