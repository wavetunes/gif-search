import type { Gif } from '../../core/gif.model';
import { layoutGifMasonry } from './gif-masonry.layout';

function gif(id: string, width: number, height: number): Gif {
  return {
    id,
    title: id,
    altText: id,
    preview: { url: `https://media.giphy.com/${id}/200w.gif`, width, height },
  };
}

const NO_MEASUREMENTS = new Map<string, number>();

describe('layoutGifMasonry', () => {
  it('should fill the first row left to right', () => {
    const layout = layoutGifMasonry([gif('a', 200, 100), gif('b', 200, 300)], 2, NO_MEASUREMENTS);

    expect(layout).toEqual([
      { column: 0, offsetRatio: 0, offsetCount: 0 },
      { column: 1, offsetRatio: 0, offsetCount: 0 },
    ]);
  });

  it('should place the next gif in the shortest column', () => {
    const layout = layoutGifMasonry(
      [gif('a', 200, 300), gif('b', 200, 100), gif('c', 200, 200)],
      2,
      NO_MEASUREMENTS,
    );

    expect(layout[2]).toEqual({ column: 1, offsetRatio: 0.5, offsetCount: 1 });
  });

  it('should keep earlier placements when gifs are appended', () => {
    const firstPage = [gif('a', 200, 300), gif('b', 200, 100), gif('c', 200, 200)];

    const before = layoutGifMasonry(firstPage, 3, NO_MEASUREMENTS);
    const after = layoutGifMasonry(
      [...firstPage, gif('d', 200, 150), gif('e', 200, 250)],
      3,
      NO_MEASUREMENTS,
    );

    expect(after.slice(0, firstPage.length)).toEqual(before);
  });

  it('should offset by the declared ratio when the gif is not measured', () => {
    const layout = layoutGifMasonry(
      [gif('a', 200, 100), gif('b', 200, 300), gif('c', 200, 200)],
      2,
      new Map([['b', 2]]),
    );

    expect(layout[2]).toEqual({ column: 0, offsetRatio: 0.5, offsetCount: 1 });
  });

  it('should offset by the measured ratio once the gif is measured', () => {
    const layout = layoutGifMasonry(
      [gif('a', 200, 100), gif('b', 200, 300), gif('c', 200, 200)],
      2,
      new Map([['a', 0.75]]),
    );

    expect(layout[2]).toEqual({ column: 0, offsetRatio: 0.75, offsetCount: 1 });
  });

  it('should only move the gifs below a measured gif in its own column', () => {
    const gifs = [
      gif('a', 200, 100),
      gif('b', 200, 300),
      gif('c', 200, 200),
      gif('d', 200, 200),
      gif('e', 200, 100),
    ];

    const before = layoutGifMasonry(gifs, 2, NO_MEASUREMENTS);
    const after = layoutGifMasonry(gifs, 2, new Map([['a', 1]]));

    expect(after.map(({ column }) => column)).toEqual(before.map(({ column }) => column));
    after.forEach((placement, index) => {
      const isBelowInColumnZero = placement.column === 0 && index > 0;
      expect(placement.offsetRatio).toBe(
        before[index].offsetRatio + (isBelowInColumnZero ? 0.5 : 0),
      );
    });
  });
});
