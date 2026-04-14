import { apiGet } from '@/lib/api';

export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface PlaceDetailsResult {
  placeId: string;
  name: string;
  address: string;
  city: string;
  zip: string;
  state: string;
  category: string;
  lat: number;
  lng: number;
}

export type GoogleEmployerSearchRow = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  details: PlaceDetailsResult;
  cached: boolean;
};

let _sessionToken = newSessionToken();

function newSessionToken(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Search South Jersey employers via the ShiftTea backend.
 * Backend handles autocomplete + DB cache + Google Places Details + NJ filtering.
 */
export async function searchSouthJerseyGoogleEmployers(
  input: string,
  maxResults: number,
): Promise<GoogleEmployerSearchRow[]> {
  if (input.trim().length < 2) return [];
  // Generate a new session token per search burst; reused for all detail calls within that burst
  _sessionToken = newSessionToken();
  const limit = Math.min(10, Math.max(1, Math.floor(maxResults)));
  const params = new URLSearchParams({
    q: input.trim(),
    limit: String(limit),
    sessiontoken: _sessionToken,
  });
  const data = await apiGet<{ results: GoogleEmployerSearchRow[] }>(`/api/places/search?${params}`);
  return data.results ?? [];
}

/**
 * Returns details for a single place from the backend search cache.
 * After calling searchSouthJerseyGoogleEmployers, details are already embedded
 * in each row — use row.details directly instead of calling this.
 * Only use this as a fallback for direct placeId lookups.
 */
export async function getPlaceDetails(googlePlaceId: string): Promise<PlaceDetailsResult | null> {
  // Re-use the current session token so this counts as part of the same billing session
  const params = new URLSearchParams({
    q: googlePlaceId,
    limit: '1',
    sessiontoken: _sessionToken,
  });
  const data = await apiGet<{ results: GoogleEmployerSearchRow[] }>(`/api/places/search?${params}`);
  return data.results?.[0]?.details ?? null;
}
