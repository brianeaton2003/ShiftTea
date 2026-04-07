/**
 * getUserReviews — Firestore read cost (per invocation, N = number of reviews returned):
 *
 * Happy path (user has `my_reviews` on `users/{uid}`):
 *   - pointersFromUserDoc: 1 document read
 *   - fetchReviewsByPointers: N document reads (via getAll; 1 read per existing review doc)
 *   Total: 1 + N reads
 *
 * Fallback (no `my_reviews`; legacy users):
 *   - pointersFromUserReviews: 1 read per row returned by the query (same as N pointer docs)
 *   - fetchReviewsByPointers: N reads for full review bodies
 *   Total: 2N reads (worst case; avoid by keeping `my_reviews` populated)
 *
 * Missing/deleted review refs: getAll still counts a read per requested doc; non-existent docs
 * still incur a read in Firestore billing.
 */

import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { callableAppCheckEnforced } from './appCheckUtil.js';
import { runWithMetrics } from './devMetrics/context.js';
import { hashUid } from './utils/hash.js';
import { db } from './firestoreDb.js';

/** Firestore batch-get limit per request (Node Admin SDK). */
export const GET_ALL_CHUNK = 10;

type ReviewPointer = { location_id: string; review_id: string };

export function parsePointers(raw: unknown): ReviewPointer[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const out: ReviewPointer[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const location_id = String((item as { location_id?: string }).location_id ?? '').trim();
    const review_id = String((item as { review_id?: string }).review_id ?? '').trim();
    if (location_id && review_id) out.push({ location_id, review_id });
  }
  return out;
}

export function chunkBy<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function toIso(created: unknown): string | null {
  if (!created) return null;
  // Avoid relying on `admin.firestore.Timestamp` constructor being available at runtime.
  // We only need the timestamp's `toDate()` method.
  const toDate = (created as { toDate?: () => Date }).toDate;
  if (typeof toDate === 'function') return toDate.call(created).toISOString();
  return null;
}

function reviewDocToJson(
  reviewId: string,
  data: FirebaseFirestore.DocumentData | undefined,
): Record<string, unknown> | null {
  if (!data) return null;
  return {
    review_id: reviewId,
    uid_hash: String(data.uid_hash ?? ''),
    created_at: toIso(data.created_at),
    rating_overall: Number(data.rating_overall),
    rating_management: Number(data.rating_management),
    rating_pay: Number(data.rating_pay),
    rating_worklife: Number(data.rating_worklife),
    rating_breaks: Number(data.rating_breaks),
    rating_recommend: Number(data.rating_recommend),
    nsfw: Boolean(data.nsfw),
    helpful_count: Number(data.helpful_count ?? 0),
    ...(data.pay_rate !== undefined && data.pay_rate !== null ? { pay_rate: Number(data.pay_rate) } : {}),
    ...(data.tenure_months !== undefined && data.tenure_months !== null
      ? { tenure_months: Number(data.tenure_months) }
      : {}),
    ...(data.body ? { body: String(data.body) } : {}),
    company_name: String(data.company_name ?? ''),
    city: String(data.city ?? ''),
    location_id: String(data.location_id ?? ''),
  };
}

/** Cost: 1 read (`users/{uid}`; billed per doc lookup, including empty snapshot). */
async function pointersFromUserDoc(uid: string): Promise<ReviewPointer[]> {
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) return [];
  return parsePointers(snap.data()?.my_reviews);
}

/** Cost: 1 read per document returned by the query (M pointers). */
async function pointersFromUserReviews(uidHash: string): Promise<ReviewPointer[]> {
  const snap = await db.collection('user_reviews').where('uid_hash', '==', uidHash).get();
  const out: ReviewPointer[] = [];
  for (const doc of snap.docs) {
    const d = doc.data();
    const location_id = String(d.location_id ?? '').trim();
    const review_id = String(d.review_id ?? '').trim();
    if (location_id && review_id) out.push({ location_id, review_id });
  }
  return out;
}

/** Cost: 1 read per pointer for each document fetched; batched getAll does not reduce read count. */
async function fetchReviewsByPointers(pointers: ReviewPointer[]): Promise<Record<string, unknown>[]> {
  if (pointers.length === 0) return [];

  const refs = pointers.map((p) =>
    db.collection('locations').doc(p.location_id).collection('reviews').doc(p.review_id),
  );

  const chunks = chunkBy(refs, GET_ALL_CHUNK);

  const snapshots = await Promise.all(chunks.map((chunk) => db.getAll(...chunk)));

  const results: Record<string, unknown>[] = [];
  for (const snapChunk of snapshots) {
    for (const snap of snapChunk) {
      if (!snap.exists) continue;
      const json = reviewDocToJson(snap.id, snap.data());
      if (json) results.push(json);
    }
  }

  return results;
}

export function sortByCreatedDesc(a: Record<string, unknown>, b: Record<string, unknown>): number {
  const ta = typeof a.created_at === 'string' ? Date.parse(a.created_at) : 0;
  const tb = typeof b.created_at === 'string' ? Date.parse(b.created_at) : 0;
  return tb - ta;
}

/** See file header for total read formula (1+N vs 2N). */
export const getUserReviews = onCall(
  {
    region: 'us-central1',
    maxInstances: 10,
    cors: true,
    invoker: 'public',
    enforceAppCheck: callableAppCheckEnforced(),
  },
  async (request) => {
  return runWithMetrics('getUserReviews', async () => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const uid = request.auth.uid;
  const uidHash = hashUid(uid);

  let pointers = await pointersFromUserDoc(uid);
  if (pointers.length === 0) {
    pointers = await pointersFromUserReviews(uidHash);
  }

  const reviews = await fetchReviewsByPointers(pointers);
  reviews.sort(sortByCreatedDesc);

  return { reviews };
  });
  },
);
