import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { containsProfanity } from './profanity.js';
import { addressFirstLine, parseDedupeParts, rowMatchesDedupe } from './workplaceNormalize.js';
import { callableAppCheckEnforced } from './appCheckUtil.js';
import { runWithMetrics } from './devMetrics/context.js';
import { db } from './firestoreDb.js';
const GOOGLE_PLACES_TEXT = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
const GOOGLE_GEOCODE = 'https://maps.googleapis.com/maps/api/geocode/json';
const CENTER = { lat: 39.79, lng: -74.82 };
const MAX_KM = 40;
const MAX_MATCHES = 5;
const MAX_NAME_LEN = 120;
const ZIP_RE = /^\d{5}$/;
const SOUTH_JERSEY_ZIP_PREFIXES = ['08'];

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * (2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

function isWithinLaunchRegion(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return distanceKm(CENTER, { lat, lng }) <= MAX_KM;
}

function looksLikeNj(formatted: string): boolean {
  const u = formatted.toUpperCase();
  return u.includes(', NJ ') || u.includes(', NJ,') || /, NJ \d{5}/.test(u);
}

type AddrParts = Array<{ long_name: string; short_name: string; types: string[] }>;

function componentsToCityZip(
  address_components: AddrParts,
): { city: string; zip: string; state: string } {
  let city = '';
  let zip = '';
  let state = '';
  for (const c of address_components) {
    if (c.types.includes('locality')) city = c.long_name;
    if (c.types.includes('postal_code')) zip = c.long_name;
    if (c.types.includes('administrative_area_level_1')) state = c.short_name || '';
  }
  if (!city) {
    const sub = address_components.find((c) => c.types.includes('sublocality'));
    if (sub) city = sub.long_name;
  }
  return { city, zip, state };
}

interface GoogleCandidate {
  place_id: string;
  company_name: string;
  address: string;
  city: string;
  zip: string;
  lat: number;
  lng: number;
}

async function textSearchPlaces(query: string, apiKey: string): Promise<GoogleCandidate[]> {
  const params = new URLSearchParams({
    query,
    key: apiKey,
    region: 'us',
  });
  const upstream = await fetch(`${GOOGLE_PLACES_TEXT}?${params}`);
  const json = (await upstream.json()) as {
    results?: Array<{
      place_id?: string;
      name?: string;
      formatted_address?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
    }>;
    status: string;
  };
  if (json.status !== 'OK' || !json.results?.length) return [];
  const out: GoogleCandidate[] = [];
  for (const r of json.results) {
    const placeId = String(r.place_id ?? '').trim();
    const name = String(r.name ?? '').trim();
    const formatted = String(r.formatted_address ?? '').trim();
    const lat = Number(r.geometry?.location?.lat ?? NaN);
    const lng = Number(r.geometry?.location?.lng ?? NaN);
    if (!placeId || !formatted || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (!looksLikeNj(formatted)) continue;
    if (!isWithinLaunchRegion(lat, lng)) continue;
    const cityGuess = formatted.split(',').slice(-3, -2)[0]?.trim() ?? '';
    const zipMatch = formatted.match(/\b(\d{5})\b/);
    const zipGuess = zipMatch?.[1] ?? '';
    out.push({
      place_id: placeId,
      company_name: name || addressFirstLine(formatted),
      address: addressFirstLine(formatted),
      city: cityGuess,
      zip: zipGuess,
      lat,
      lng,
    });
  }
  return out;
}

async function geocodeToCandidate(address: string, apiKey: string): Promise<GoogleCandidate | null> {
  const params = new URLSearchParams({
    address,
    components: 'country:US',
    key: apiKey,
  });
  const upstream = await fetch(`${GOOGLE_GEOCODE}?${params}`);
  const json = (await upstream.json()) as {
    results?: Array<{
      place_id?: string;
      formatted_address: string;
      address_components: AddrParts;
      geometry?: { location?: { lat?: number; lng?: number } };
    }>;
    status: string;
  };
  if (json.status !== 'OK' || !json.results?.[0]) return null;
  const r = json.results[0];
  const placeId = String(r.place_id ?? '').trim();
  const formatted = String(r.formatted_address ?? '').trim();
  const lat = Number(r.geometry?.location?.lat ?? NaN);
  const lng = Number(r.geometry?.location?.lng ?? NaN);
  if (!formatted || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const { city, zip, state } = componentsToCityZip(r.address_components ?? []);
  if (state !== 'NJ') return null;
  if (!isWithinLaunchRegion(lat, lng)) return null;
  if (!placeId) return null;
  const lineName =
    addressFirstLine(formatted) || formatted.split(',')[0]?.trim() || 'Workplace';
  return {
    place_id: placeId,
    company_name: lineName,
    address: addressFirstLine(formatted),
    city: city || 'Unknown',
    zip: zip || '',
    lat,
    lng,
  };
}

type MatchResult =
  | {
      source: 'database';
      location_id: string;
      company_name: string;
      address: string;
      city: string;
      zip: string;
    }
  | {
      source: 'google';
      place_id: string;
      company_name: string;
      address: string;
      city: string;
      zip: string;
      lat: number;
      lng: number;
    };

export const matchCustomWorkplace = onCall(
  {
    region: 'us-central1',
    maxInstances: 10,
    cors: true,
    invoker: 'public',
    secrets: ['GOOGLE_PLACES_API_KEY_SECRET'],
    enforceAppCheck: callableAppCheckEnforced(),
  },
  async (request) => {
    return runWithMetrics('matchCustomWorkplace', async () => {
    const data = (request.data ?? {}) as {
      company_name?: unknown;
      street?: unknown;
      city?: unknown;
      zip?: unknown;
    };

    const companyName = String(data.company_name ?? '').trim().slice(0, MAX_NAME_LEN);
    const street = String(data.street ?? '').trim();
    const city = String(data.city ?? '').trim();
    const zipRaw = String(data.zip ?? '').trim();

    if (!companyName) {
      throw new HttpsError('invalid-argument', 'missing-company_name');
    }
    if (!street || !city) {
      throw new HttpsError('invalid-argument', 'missing-address');
    }
    const zipDigits = zipRaw.replace(/\D/g, '').slice(0, 5);
    if (!ZIP_RE.test(zipDigits) || !SOUTH_JERSEY_ZIP_PREFIXES.some((p) => zipDigits.startsWith(p))) {
      throw new HttpsError('invalid-argument', 'invalid-zip');
    }
    if (/\d/.test(city)) {
      throw new HttpsError('invalid-argument', 'invalid-city');
    }
    if (containsProfanity(companyName) || containsProfanity(street)) {
      throw new HttpsError('invalid-argument', 'profanity-not-allowed');
    }

    const parts = parseDedupeParts(companyName, street, city, zipDigits);
    if (!parts) {
      throw new HttpsError('invalid-argument', 'invalid-payload');
    }

    const snap = await db
      .collection('locations')
      .where('company_name_lower', '==', parts.normName)
      .where('zip', '==', parts.zip5)
      .limit(25)
      .get();

    const dbRows: MatchResult[] = [];
    for (const doc of snap.docs) {
      const row = doc.data();
      if (!rowMatchesDedupe(row, parts)) continue;
      dbRows.push({
        source: 'database',
        location_id: doc.id,
        company_name: String(row.company_name ?? ''),
        address: String(row.address ?? ''),
        city: String(row.city ?? ''),
        zip: String(row.zip ?? ''),
      });
      if (dbRows.length >= MAX_MATCHES) break;
    }

    if (dbRows.length > 0) {
      return { matches: dbRows };
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY_SECRET;
    if (!apiKey) {
      throw new HttpsError('internal', 'missing-google-api-key');
    }

    const textQuery = `${companyName} ${street} ${city} NJ ${zipDigits}`;
    const fullAddress = `${street}, ${city}, NJ ${zipDigits}`;

    const [fromText, fromGeo] = await Promise.all([
      textSearchPlaces(textQuery, apiKey),
      geocodeToCandidate(fullAddress, apiKey),
    ]);

    const merged = new Map<string, GoogleCandidate>();
    const order: string[] = [];

    for (const c of fromText) {
      if (!merged.has(c.place_id)) {
        merged.set(c.place_id, c);
        order.push(c.place_id);
      }
      if (order.length >= 12) break;
    }
    if (fromGeo && !merged.has(fromGeo.place_id)) {
      merged.set(fromGeo.place_id, fromGeo);
      order.push(fromGeo.place_id);
    }

    const googleMatches: MatchResult[] = [];
    for (const pid of order) {
      const c = merged.get(pid);
      if (!c) continue;
      googleMatches.push({
        source: 'google',
        place_id: c.place_id,
        company_name: c.company_name,
        address: c.address,
        city: c.city,
        zip: c.zip,
        lat: c.lat,
        lng: c.lng,
      });
      if (googleMatches.length >= MAX_MATCHES) break;
    }

    return { matches: googleMatches };
    });
  },
);
