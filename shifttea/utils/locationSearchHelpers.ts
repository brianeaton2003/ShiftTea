export const MAX_LOCATION_SEARCH_LIMIT = 25;

export function normalizeSearchPrefix(raw: string): string {
  return raw.trim().toLowerCase().slice(0, 100);
}

export function getSafeLocationSearchLimit(limitCount: number): number {
  return Math.min(Math.max(1, Math.floor(limitCount || 1)), MAX_LOCATION_SEARCH_LIMIT);
}

export function isSouthJerseyZip(zip: string): boolean {
  return zip.startsWith('08');
}
