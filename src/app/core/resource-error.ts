import { GiphyApiError } from './api/giphy-api.error';

export function toErrorKind<K extends string>(error: Error): K | 'unknown' {
  return error instanceof GiphyApiError ? (error.kind as K) : 'unknown';
}
