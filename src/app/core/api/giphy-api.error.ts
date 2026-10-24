export class GiphyApiError<K extends string = string> extends Error {
  constructor(readonly kind: K) {
    super(`Giphy request failed: ${kind}`);
    this.name = 'GiphyApiError';
  }
}
