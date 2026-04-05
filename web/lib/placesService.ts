export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

import { getAppCheckHeaders } from '@/lib/firebase';

const PROXY_URL = `https://us-central1-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.cloudfunctions.net/placesProxy`;

async function placesProxyFetch(params: URLSearchParams): Promise<Response> {
  const headers = await getAppCheckHeaders();
  return fetch(`${PROXY_URL}?${params}`, { headers });
}

function newSessionToken(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

let _sessionToken = newSessionToken();

export async function autocomplete(input: string): Promise<PlacePrediction[]> {
  if (input.trim().length < 2) return [];
  const params = new URLSearchParams({
    action: 'autocomplete',
    input: input.trim(),
    sessiontoken: _sessionToken,
  });
  const res = await placesProxyFetch(params);
  const json = await res.json() as {
    predictions?: Array<{
      place_id: string;
      description: string;
      structured_formatting?: { main_text: string; secondary_text: string };
    }>;
    status: string;
  };
  if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') return [];
  return (json.predictions ?? []).map((p) => ({
    placeId: p.place_id,
    description: p.description,
    mainText: p.structured_formatting?.main_text ?? p.description,
    secondaryText: p.structured_formatting?.secondary_text ?? '',
  }));
}

export interface PlaceDetailsResult {
  /** Google place id, or empty when geocode did not return one (use a manual id client-side). */
  placeId: string;
  name: string;
  address: string;
  city: string;
  zip: string;
  /** Google `administrative_area_level_1` short name, e.g. `NJ`. */
  state: string;
  category: string;
  lat: number;
  lng: number;
}

type AddrParts = Array<{ long_name: string; short_name: string; types: string[] }>;

function addressComponentsToDetails(
  placeId: string,
  formattedAddress: string,
  address_components: AddrParts,
  geometry: { location: { lat: number; lng: number } } | undefined,
  establishmentName: string | null,
  types: string[] | undefined,
): PlaceDetailsResult | null {
  const loc = geometry?.location;
  if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return null;

  let city = '';
  let zip = '';
  let state = '';
  let streetNum = '';
  let route = '';
  for (const c of address_components) {
    if (c.types.includes('locality')) city = c.long_name;
    if (c.types.includes('postal_code')) zip = c.long_name;
    if (c.types.includes('administrative_area_level_1')) {
      state = c.short_name || (c.long_name === 'New Jersey' ? 'NJ' : '');
    }
    if (c.types.includes('street_number')) streetNum = c.long_name;
    if (c.types.includes('route')) route = c.long_name;
  }
  if (!city) {
    const sub = address_components.find((c) => c.types.includes('sublocality'));
    if (sub) city = sub.long_name;
  }
  const lineName =
    establishmentName ??
    ([streetNum, route].filter(Boolean).join(' ').trim() ||
      formattedAddress.split(',')[0]?.trim() ||
      'Workplace');
  const rawType =
    types?.find((t) => t === 'street_address' || t === 'premise' || t === 'establishment' || t === 'point_of_interest') ??
    types?.[0];
  const category = rawType?.replace(/_/g, ' ') ?? 'business';

  return {
    placeId,
    name: lineName,
    address: formattedAddress,
    city: city || 'Unknown',
    zip: zip || '',
    state,
    category,
    lat: loc.lat,
    lng: loc.lng,
  };
}

export async function getPlaceDetails(googlePlaceId: string): Promise<PlaceDetailsResult | null> {
  const sessiontoken = _sessionToken;
  _sessionToken = newSessionToken();

  const params = new URLSearchParams({ action: 'details', place_id: googlePlaceId, sessiontoken });
  const res = await placesProxyFetch(params);
  const json = await res.json() as {
    result?: {
      name: string;
      formatted_address: string;
      address_components: AddrParts;
      geometry?: { location: { lat: number; lng: number } };
      types: string[];
    };
    status: string;
  };

  if (json.status !== 'OK' || !json.result) return null;
  const r = json.result;
  return addressComponentsToDetails(
    googlePlaceId,
    r.formatted_address,
    r.address_components,
    r.geometry,
    r.name,
    r.types,
  );
}

/** Geocode a street address in NJ (caller should pass city + NJ ZIP). */
export async function geocodeStreetAddress(
  streetLine: string,
  city: string,
  zip: string,
): Promise<PlaceDetailsResult | null> {
  const address = `${streetLine.trim()}, ${city.trim()}, NJ ${zip.trim()}`;
  const params = new URLSearchParams({ action: 'geocode', address });
  const res = await placesProxyFetch(params);
  const json = await res.json() as {
    results?: Array<{
      place_id?: string;
      formatted_address: string;
      address_components: AddrParts;
      geometry?: { location: { lat: number; lng: number } };
      types: string[];
    }>;
    status: string;
  };

  if (json.status !== 'OK' || !json.results?.[0]) return null;
  const r = json.results[0];
  const pid = String(r.place_id ?? '').trim();
  return addressComponentsToDetails(pid, r.formatted_address, r.address_components, r.geometry, null, r.types);
}
