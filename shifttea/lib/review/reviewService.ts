'use client';

import { collection, doc, getDoc, getDocs, getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { apiPost, apiAuthGet } from '@/lib/api';
import type { ReviewDoc, SubmitReviewPayload } from '@/types';

// ─── Submit review ────────────────────────────────────────────────────────────

export async function submitReview(
  payload: SubmitReviewPayload & { place_id?: string },
): Promise<{ success: boolean; review_id: string }> {
  return apiPost('/api/reviews', payload);
}

// ─── Get user's own reviews (direct Firestore read) ───────────────────────────

function toTimestamp(c: unknown): Timestamp | null {
  if (!c) return null;
  if (typeof c === 'string' && c) return Timestamp.fromDate(new Date(c));
  if (typeof c === 'object' && c !== null && 'seconds' in c) {
    const s = c as { seconds: number; nanoseconds?: number };
    return new Timestamp(s.seconds, s.nanoseconds ?? 0);
  }
  return null;
}

export async function getUserReviews(): Promise<ReviewDoc[]> {
  const uid = getAuth().currentUser?.uid;
  if (!uid) return [];

  const db = getFirestore();

  // 1. Read the user doc to get review pointers
  const userSnap = await getDoc(doc(db, 'users', uid));
  if (!userSnap.exists()) return [];

  const myReviews = userSnap.data()?.my_reviews as
    | Array<{ location_id: string; review_id: string; company_name: string }>
    | undefined;

  if (!Array.isArray(myReviews) || myReviews.length === 0) return [];

  // 2. Fetch each review doc individually (Firestore web SDK doesn't have getAll)
  const fetches = myReviews.map(({ location_id, review_id }) =>
    getDoc(doc(db, 'locations', location_id, 'reviews', review_id)),
  );

  const snaps = await Promise.all(fetches);
  const results: ReviewDoc[] = [];

  for (const snap of snaps) {
    if (!snap.exists()) continue;
    const d = snap.data();
    results.push({
      review_id: snap.id,
      uid_hash: String(d.uid_hash ?? ''),
      created_at: toTimestamp(d.created_at),
      rating_overall: Number(d.rating_overall),
      rating_management: Number(d.rating_management),
      rating_pay: Number(d.rating_pay),
      rating_worklife: Number(d.rating_worklife),
      rating_breaks: Number(d.rating_breaks),
      rating_recommend: Number(d.rating_recommend),
      ...(d.pay_rate !== undefined ? { pay_rate: Number(d.pay_rate) } : {}),
      ...(d.tenure_months !== undefined ? { tenure_months: Number(d.tenure_months) } : {}),
      ...(d.body ? { body: String(d.body) } : {}),
      ...(d.nsfw !== undefined ? { nsfw: Boolean(d.nsfw) } : {}),
      ...(d.helpful_count !== undefined ? { helpful_count: Number(d.helpful_count) } : {}),
      company_name: String(d.company_name ?? ''),
      city: String(d.city ?? ''),
      location_id: String(d.location_id ?? ''),
    });
  }

  return results.sort((a, b) => {
    const ta = a.created_at?.toMillis() ?? 0;
    const tb = b.created_at?.toMillis() ?? 0;
    return tb - ta;
  });
}

// ─── Toggle helpful vote ──────────────────────────────────────────────────────

export async function toggleReviewHelpful(payload: {
  location_id: string;
  review_id: string;
}): Promise<{ helpful: boolean; helpful_count: number }> {
  return apiPost(`/api/reviews/${payload.review_id}/helpful`, {
    location_id: payload.location_id,
  });
}

// ─── Get helpful votes for a location (server-side, needs uid_hash) ───────────

export async function getHelpfulVotesForLocation(payload: {
  location_id: string;
}): Promise<{ review_ids: string[] }> {
  return apiAuthGet(`/api/reviews/helpful/${payload.location_id}`);
}

// ─── Error helpers ────────────────────────────────────────────────────────────

export function isAlreadyReviewedError(err: unknown): boolean {
  if (err && typeof err === 'object') {
    if ('status' in err && (err as { status?: number }).status === 409) return true;
    if ('message' in err && String((err as { message?: string }).message).includes('already-reviewed')) return true;
  }
  return false;
}
