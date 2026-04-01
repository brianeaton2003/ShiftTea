/// <reference types="vitest/globals" />

import { GET_ALL_CHUNK, chunkBy, parsePointers, sortByCreatedDesc } from './getUserReviews.js';

describe('getUserReviews cost-related helpers', () => {
  it('parses only valid location/review pointers', () => {
    const result = parsePointers([
      { location_id: 'loc-1', review_id: 'rev-1' },
      { location_id: 'loc-2', review_id: '   ' },
      { location_id: '', review_id: 'rev-3' },
      null,
      'bad',
      { location_id: 'loc-4', review_id: 'rev-4' },
    ]);

    expect(result).toEqual([
      { location_id: 'loc-1', review_id: 'rev-1' },
      { location_id: 'loc-4', review_id: 'rev-4' },
    ]);
  });

  it('chunks pointers into bounded getAll batches', () => {
    const refs = Array.from({ length: GET_ALL_CHUNK * 2 + 3 }, (_, i) => `ref-${i}`);
    const chunks = chunkBy(refs, GET_ALL_CHUNK);

    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(GET_ALL_CHUNK);
    expect(chunks[1]).toHaveLength(GET_ALL_CHUNK);
    expect(chunks[2]).toHaveLength(3);
  });

  it('sorts newest reviews first', () => {
    const reviews = [
      { review_id: 'a', created_at: '2026-01-01T00:00:00.000Z' },
      { review_id: 'b', created_at: '2026-03-01T00:00:00.000Z' },
      { review_id: 'c', created_at: '2025-12-01T00:00:00.000Z' },
    ];

    reviews.sort(sortByCreatedDesc);
    expect(reviews.map((r) => r.review_id)).toEqual(['b', 'a', 'c']);
  });
});
