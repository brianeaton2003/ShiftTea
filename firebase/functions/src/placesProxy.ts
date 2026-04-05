/**
 * placesProxy — Firestore: 0 reads / 0 writes (HTTPS proxy only; Google Places API usage is separate billing).
 * Requires Firebase App Check (X-Firebase-AppCheck) on GET except OPTIONS, unless APPCHECK_DISABLE=true or Functions emulator.
 */

import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { runWithMetrics } from './devMetrics/context.js';
import { shouldVerifyAppCheck } from './appCheckUtil.js';

if (!admin.apps.length) {
  admin.initializeApp();
}

const GOOGLE_PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';
const AUTOCOMPLETE_CENTER = { lat: 39.79, lng: -74.82 };

export const placesProxy = onRequest(
  {
    maxInstances: 10,
    region: 'us-central1',
    secrets: ['GOOGLE_PLACES_API_KEY_SECRET'],
    invoker: 'public',
    cors: true,
  },
  async (req, res) => {
    return runWithMetrics('placesProxy', async () => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Firebase-AppCheck');
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (shouldVerifyAppCheck()) {
      const token = req.header('X-Firebase-AppCheck');
      if (!token) {
        res.status(401).json({ status: 'ERROR', error: 'app-check-missing' });
        return;
      }
      try {
        await admin.appCheck().verifyToken(token);
      } catch {
        res.status(401).json({ status: 'ERROR', error: 'app-check-invalid' });
        return;
      }
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY_SECRET;
    if (!apiKey) {
      res.status(500).json({ status: 'ERROR', error: 'missing-api-key' });
      return;
    }

    const action = req.query.action as string;

    if (action === 'autocomplete') {
      const input = (req.query.input as string | undefined)?.trim() ?? '';
      const sessiontoken = (req.query.sessiontoken as string | undefined) ?? '';

      if (input.length < 2) {
        res.json({ predictions: [], status: 'ZERO_RESULTS' });
        return;
      }

      const params = new URLSearchParams({
        input,
        types: 'establishment',
        location: `${AUTOCOMPLETE_CENTER.lat},${AUTOCOMPLETE_CENTER.lng}`,
        radius: '30000',
        strictbounds: 'true',
        components: 'country:US',
        key: apiKey,
      });
      if (sessiontoken) params.set('sessiontoken', sessiontoken);

      const upstream = await fetch(`${GOOGLE_PLACES_BASE}/autocomplete/json?${params}`);
      const json = await upstream.json();
      res.json(json);
      return;
    }

    if (action === 'details') {
      const placeId = (req.query.place_id as string | undefined)?.trim() ?? '';
      const sessiontoken = (req.query.sessiontoken as string | undefined) ?? '';

      if (!placeId) {
        res.status(400).json({ status: 'INVALID_REQUEST', error: 'missing-place_id' });
        return;
      }

      const params = new URLSearchParams({
        place_id: placeId,
        fields: 'name,formatted_address,address_components,geometry,types',
        key: apiKey,
      });
      if (sessiontoken) params.set('sessiontoken', sessiontoken);

      const upstream = await fetch(`${GOOGLE_PLACES_BASE}/details/json?${params}`);
      const json = await upstream.json();
      res.json(json);
      return;
    }

    if (action === 'geocode') {
      const address = (req.query.address as string | undefined)?.trim() ?? '';
      if (address.length < 8) {
        res.status(400).json({ status: 'INVALID_REQUEST', error: 'address-too-short' });
        return;
      }

      const params = new URLSearchParams({
        address,
        components: 'country:US',
        key: apiKey,
      });
      const upstream = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
      const json = await upstream.json();
      res.json(json);
      return;
    }

    res.status(400).json({ status: 'INVALID_REQUEST', error: 'unknown-action' });
    });
  },
);
