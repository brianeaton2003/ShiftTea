/// <reference types="vitest/globals" />

import { assertRating, nextAvg } from './submitReview.js';

describe('submitReview write-safety helpers', () => {
  it('accepts only integer ratings in range 1..5', () => {
    expect(assertRating('rating_overall', 1)).toBe(1);
    expect(assertRating('rating_overall', 5)).toBe(5);
    expect(() => assertRating('rating_overall', 0)).toThrow();
    expect(() => assertRating('rating_overall', 6)).toThrow();
    expect(() => assertRating('rating_overall', 4.5)).toThrow();
  });

  it('computes aggregate averages without extra reads', () => {
    expect(nextAvg(undefined, 0, 4)).toBe(4);
    expect(nextAvg(3.5, 2, 5)).toBeCloseTo(4, 6);
    expect(nextAvg(NaN, 2, 2)).toBe(2);
  });
});
