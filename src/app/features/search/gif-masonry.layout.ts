import type { Gif } from '../../core/gif.model';

export interface GifMasonryPlacement {
  readonly column: number;
  readonly offsetRatio: number;
  readonly offsetCount: number;
}

export function layoutGifMasonry(
  gifs: readonly Gif[],
  columnCount: number,
  measuredRatios: ReadonlyMap<string, number>,
): readonly GifMasonryPlacement[] {
  const columnDeclaredRatios = Array.from({ length: columnCount }, () => 0);
  const columnRatios = Array.from({ length: columnCount }, () => 0);
  const columnCounts = Array.from({ length: columnCount }, () => 0);

  return gifs.map((gif) => {
    const column = columnDeclaredRatios.indexOf(Math.min(...columnDeclaredRatios));
    const placement = {
      column,
      offsetRatio: columnRatios[column],
      offsetCount: columnCounts[column],
    };
    const declaredRatio = gif.preview.height / gif.preview.width;
    columnDeclaredRatios[column] += declaredRatio;
    columnRatios[column] += measuredRatios.get(gif.id) ?? declaredRatio;
    columnCounts[column] += 1;
    return placement;
  });
}
