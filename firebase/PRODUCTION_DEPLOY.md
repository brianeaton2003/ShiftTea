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

`placesProxy` and `ensureLocationFromPlace` require a Google Places key.

```bash
firebase functions:secrets:set GOOGLE_PLACES_API_KEY_SECRET
```

## 3) Deploy rules + indexes + functions

```bash
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only functions
```

## 4) Post-deploy quick checks

- `placesProxy` HTTP endpoint returns responses from Google Places.
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

