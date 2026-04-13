# ShiftTea Firebase Production Deploy

This project uses Firebase aliases in `.firebaserc`:

- `dev` -> `shifttea-dev`
- `prod` -> `shifttea-prod`

## 1) Select the production project

From `firebase/`:

```bash
firebase use prod
```

Verify:

```bash
firebase projects:list
firebase use
```

## 2) Configure required secrets

`placesProxy`, `ensureLocationFromPlace`, and `matchCustomWorkplace` use **Places API (New)** (`places.googleapis.com`) and need a Google Maps API key with **Places API (New)** enabled in the same GCP project. `placesProxy` geocoding and `matchCustomWorkplace` address fallback still call the **Geocoding API** — enable that API as well.

```bash
firebase functions:secrets:set GOOGLE_PLACES_API_KEY_SECRET
```

## 3) Deploy rules + indexes + functions

```bash
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only functions
```

## 4) Post-deploy quick checks

- `placesProxy` HTTP endpoint returns Autocomplete (New) and Place Details (New) JSON (and Geocoding API JSON for `action=geocode`).
- Callable functions succeed:
  - `submitReview`
  - `toggleReviewHelpful`
  - `getHelpfulVotesForLocation`
  - `ensureLocationFromPlace`
- Firestore writes still blocked from clients for `locations` and `reviews` (writes happen through callables only).

## 5) Safety notes

- Never run the seed script against production.
- Keep `NEXT_PUBLIC_FIREBASE_USE_EMULATORS=false` in production builds.
- Confirm Functions region stays aligned with client (`us-central1`).

