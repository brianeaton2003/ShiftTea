/// <reference types="vitest/globals" />

import {
  getSafeLocationSearchLimit,
  isSouthJerseyZip,
  normalizeSearchPrefix,
} from './locationSearchCost';

describe('location search cost guards', () => {
  it('normalizes and trims the search prefix', () => {
    expect(normalizeSearchPrefix('  WaWa  ')).toBe('wawa');
  });

  it('caps result size to protect against expensive reads', () => {
    expect(getSafeLocationSearchLimit(5000)).toBe(25);
    expect(getSafeLocationSearchLimit(0)).toBe(1);
    expect(getSafeLocationSearchLimit(12)).toBe(12);
  });
});

describe('launch-region guard', () => {
  it('allows only South Jersey ZIPs (08xxx)', () => {
    expect(isSouthJerseyZip('08028')).toBe(true);
    expect(isSouthJerseyZip('08102')).toBe(true);
    expect(isSouthJerseyZip('19103')).toBe(false);
  });
});
