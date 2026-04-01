# ShiftTea Cost Guardrails (Balanced)

Use this checklist before public launch to avoid unexpected billing spikes while keeping UX responsive.

## Firebase budget alerts

In Google Cloud Billing for the `shifttea-prod` project:

- Create monthly budget alerts at 25%, 50%, 80%, and 100%.
- Add email notifications to all owners/admins.

## Functions controls

- Keep `maxInstances` caps enabled (already configured globally and per expensive function).
- Keep Google Places usage behind server functions (`placesProxy`, `ensureLocationFromPlace`) instead of exposing API keys directly to clients.
- Monitor function logs for high-frequency unauthenticated calls.

## Firestore read/write controls

- Keep all mutable writes through callable functions only.
- Keep client writes disabled on `locations` and `reviews` via security rules.
- Keep pagination for location reviews (`PAGE_SIZE = 5`) and avoid unbounded list reads.
- Keep recent reviews capped on home page (`limit(3)`).

## Search/API usage controls

- Use batched local-first location search.
- Cache Google place details during a search session to avoid repeated detail lookups.
- Keep debounce delays in place for search input.

## Launch monitoring

Track daily during week 1:

- Firestore document reads/writes
- Cloud Functions invocations and errors
- Google Places API call volume

If usage jumps unexpectedly, temporarily reduce search batch size and increase debounce delay.

