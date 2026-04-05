/**
 * Firestore operation metrics (reads/writes) for local development.
 *
 * Enable with BOTH:
 *   - Firebase Functions emulator (`FUNCTIONS_EMULATOR=true`, set automatically)
 *   - `SHIFTTEA_FIRESTORE_METRICS=1` in the **functions** process (not Next.js).
 *
 * Next.js env files (shifttea/.env.development.local) do not apply here.
 * Use `firebase/functions/.env.local` (see `.env.example`) or repo root `npm run dev:metrics`.
 */

export function isFirestoreMetricsEnabled(): boolean {
  return (
    process.env.FUNCTIONS_EMULATOR === 'true' &&
    (process.env.SHIFTTEA_FIRESTORE_METRICS === '1' || process.env.SHIFTTEA_FIRESTORE_METRICS === 'true')
  );
}
