import { GeoPoint, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { callableAppCheckEnforced } from './appCheckUtil.js';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const GOOGLE_PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';
const CENTER = { lat: 39.79, lng: -74.82 };
const MAX_KM = 40;

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

type Payload = { place_id?: unknown };

export const ensureLocationFromPlace = onCall(
  {
    region: 'us-central1',
    maxInstances: 10,
    cors: true,
    invoker: 'public',
    secrets: ['GOOGLE_PLACES_API_KEY_SECRET'],
    enforceAppCheck: callableAppCheckEnforced(),
  },
  async (request) => {
    const data = (request.data ?? {}) as Payload;
    const placeId = String(data.place_id ?? '').trim();
    if (!placeId) throw new HttpsError('invalid-argument', 'missing-place_id');

    const locRef = db.collection('locations').doc(placeId);
    const existing = await locRef.get();
    if (existing.exists) {
      const d = existing.data() ?? {};
      return {
        location_id: placeId,
        company_name: String(d.company_name ?? ''),
        created: false,
      };
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY_SECRET;
    if (!apiKey) throw new HttpsError('internal', 'missing-google-places-api-key');

    const params = new URLSearchParams({
      place_id: placeId,
      fields: 'name,formatted_address,address_components,geometry,types',
      key: apiKey,
    });
    const upstream = await fetch(`${GOOGLE_PLACES_BASE}/details/json?${params}`);
    const json = (await upstream.json()) as {
      status: string;
      result?: {
        name?: string;
        formatted_address?: string;
        address_components?: Array<{ long_name?: string; short_name?: string; types?: string[] }>;
        geometry?: { location?: { lat?: number; lng?: number } };
        types?: string[];
      };
    };

    if (json.status !== 'OK' || !json.result) {
      throw new HttpsError('not-found', 'place-not-found');
    }

    const result = json.result;
    const ac = result.address_components ?? [];
    const state = ac.find((c) => c.types?.includes('administrative_area_level_1'))?.short_name ?? '';
    const city =
      ac.find((c) => c.types?.includes('locality'))?.long_name ??
      ac.find((c) => c.types?.includes('sublocality'))?.long_name ??
      '';
    const zip = ac.find((c) => c.types?.includes('postal_code'))?.long_name ?? '';
    const lat = Number(result.geometry?.location?.lat ?? NaN);
    const lng = Number(result.geometry?.location?.lng ?? NaN);

    if (state !== 'NJ') throw new HttpsError('failed-precondition', 'outside-nj');
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new HttpsError('failed-precondition', 'invalid-geo');
    if (distanceKm(CENTER, { lat, lng }) > MAX_KM) throw new HttpsError('failed-precondition', 'outside-launch-region');

    const companyName = String(result.name ?? '').trim();
    const address = String(result.formatted_address ?? '').trim();
    const category = String(result.types?.[0] ?? 'business').replace(/_/g, ' ');

    await locRef.set({
      location_id: placeId,
      company_name: companyName,
      company_name_lower: companyName.toLowerCase(),
      address,
      city,
      zip,
      category,
      geo_point: new GeoPoint(lat, lng),
      review_count: 0,
      avg_rating: 0,
      avg_management: 0,
      avg_pay: 0,
      avg_worklife: 0,
      avg_breaks: 0,
      avg_recommend: 0,
      created_by: 'places-import',
      created_at: Timestamp.now(),
    });

    return {
      location_id: placeId,
      company_name: companyName,
      created: true,
    };
  },
);

