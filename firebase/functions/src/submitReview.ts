import { FieldValue, GeoPoint, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { callableAppCheckEnforced } from './appCheckUtil.js';
import { runWithMetrics } from './devMetrics/context.js';
import type { SubmitReviewPayload } from './types.js';
import { hashUid } from './utils/hash.js';
import { containsProfanity } from './profanity.js';
import { db } from './firestoreDb.js';

export function assertRating(name: string, v: unknown): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 5) {
    throw new HttpsError('invalid-argument', `invalid-${name}`);
  }
  return v;
}

export function nextAvg(oldAvg: number | undefined, oldCount: number, newVal: number): number {
  if (oldCount <= 0 || oldAvg === undefined || Number.isNaN(oldAvg)) return newVal;
  return (oldAvg * oldCount + newVal) / (oldCount + 1);
}

/**
 * submitReview — Firestore cost (per successful submission, single transaction):
 *   Reads: 2 — `user_reviews/{uidHash}_{locationId}` + `locations/{locationId}`
 *   Writes: 5 — review subdoc, user_review pointer, user merge, app_stats merge, location create/update
 *   No collection scans.
 */

export const submitReview = onCall(
  {
    region: 'us-central1',
    maxInstances: 10,
    cors: true,
    invoker: 'public',
    enforceAppCheck: callableAppCheckEnforced(),
  },
  async (request) => {
  return runWithMetrics('submitReview', async () => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const uid = request.auth.uid;
  const data = request.data as SubmitReviewPayload;

  if (!data || typeof data !== 'object') {
    throw new HttpsError('invalid-argument', 'invalid-payload');
  }

  const locationId = String(data.location_id ?? '').trim();
  const companyName = String(data.company_name ?? '').trim();
  const address = String(data.address ?? '').trim();
  const city = String(data.city ?? '').trim();
  const zip = String(data.zip ?? '').trim();
  const category = String(data.category ?? '').trim();
  const geo = data.geo_point;

  if (!locationId || !companyName) {
    throw new HttpsError('invalid-argument', 'missing-location');
  }
  if (!geo || typeof geo.lat !== 'number' || typeof geo.lng !== 'number') {
    throw new HttpsError('invalid-argument', 'invalid-geo');
  }

  const companyNameLower = companyName.toLowerCase();

  const ratingOverall = assertRating('rating_overall', data.rating_overall);
  const ratingManagement = assertRating('rating_management', data.rating_management);
  const ratingPay = assertRating('rating_pay', data.rating_pay);
  const ratingWorklife = assertRating('rating_worklife', data.rating_worklife);
  const ratingBreaks = assertRating('rating_breaks', data.rating_breaks);
  const ratingRecommend = assertRating('rating_recommend', data.rating_recommend);

  let body: string | undefined;
  if (data.body !== undefined && data.body !== null) {
    body = String(data.body);
    if (body.length > 500) {
      throw new HttpsError('invalid-argument', 'body-too-long');
    }
  }

  // Location creation (when the location doc doesn't exist yet) should be blocked if profane.
  // Reviews are allowed, but we flag NSFW based on profane written review bodies.
  const locationProhibited = containsProfanity(companyName) || containsProfanity(address);
  const bodyIsNsfw = body ? containsProfanity(body) : false;

  if (data.pay_rate !== undefined && data.pay_rate !== null) {
    const pr = Number(data.pay_rate);
    if (!Number.isFinite(pr) || pr <= 0) {
      throw new HttpsError('invalid-argument', 'invalid-pay_rate');
    }
  }

  if (data.tenure_months !== undefined && data.tenure_months !== null) {
    const tm = Number(data.tenure_months);
    if (!Number.isInteger(tm) || tm <= 0) {
      throw new HttpsError('invalid-argument', 'invalid-tenure_months');
    }
  }

  const uidHash = hashUid(uid);
  const userReviewId = `${uidHash}_${locationId}`;
  const userReviewRef = db.collection('user_reviews').doc(userReviewId);
  const locRef = db.collection('locations').doc(locationId);
  const reviewRef = locRef.collection('reviews').doc();
  const reviewId = reviewRef.id;
  const userRef = db.collection('users').doc(uid);
  const appStatsRef = db.collection('app_stats').doc('global');

  return await db.runTransaction(async (tx) => {
    const urSnap = await tx.get(userReviewRef);
    if (urSnap.exists) {
      throw new HttpsError('already-exists', 'already-reviewed');
    }

    const locSnap = await tx.get(locRef);
    const exists = locSnap.exists;
    const loc = locSnap.data();
    const oldCount = exists ? Number(loc?.review_count ?? 0) : 0;

    if (!exists && locationProhibited) {
      // Block creation of new location listings with profane names/addresses.
      throw new HttpsError('invalid-argument', 'profanity-not-allowed');
    }

    const reviewPayload: Record<string, unknown> = {
      uid_hash: uidHash,
      created_at: FieldValue.serverTimestamp(),
      rating_overall: ratingOverall,
      rating_management: ratingManagement,
      rating_pay: ratingPay,
      rating_worklife: ratingWorklife,
      rating_breaks: ratingBreaks,
      rating_recommend: ratingRecommend,
      company_name: companyName,
      city,
      location_id: locationId,
      nsfw: bodyIsNsfw,
      helpful_count: 0,
    };

    if (data.pay_rate !== undefined && data.pay_rate !== null) {
      reviewPayload.pay_rate = Number(data.pay_rate);
    }
    if (data.tenure_months !== undefined && data.tenure_months !== null) {
      reviewPayload.tenure_months = Number(data.tenure_months);
    }
    if (body) reviewPayload.body = body;

    tx.set(reviewRef, reviewPayload);

    if (!exists) {
      tx.set(locRef, {
        location_id: locationId,
        company_name: companyName,
        company_name_lower: companyNameLower,
        address,
        city,
        zip,
        category,
        geo_point: new GeoPoint(geo.lat, geo.lng),
        review_count: 1,
        avg_rating: ratingOverall,
        avg_management: ratingManagement,
        avg_pay: ratingPay,
        avg_worklife: ratingWorklife,
        avg_breaks: ratingBreaks,
        avg_recommend: ratingRecommend,
        created_by: uid,
        created_at: Timestamp.now(),
      });
    } else {
      tx.update(locRef, {
        company_name: companyName,
        company_name_lower: companyNameLower,
        review_count: FieldValue.increment(1),
        avg_rating: nextAvg(loc?.avg_rating as number | undefined, oldCount, ratingOverall),
        avg_management: nextAvg(loc?.avg_management as number | undefined, oldCount, ratingManagement),
        avg_pay: nextAvg(loc?.avg_pay as number | undefined, oldCount, ratingPay),
        avg_worklife: nextAvg(loc?.avg_worklife as number | undefined, oldCount, ratingWorklife),
        avg_breaks: nextAvg(loc?.avg_breaks as number | undefined, oldCount, ratingBreaks),
        avg_recommend: nextAvg(loc?.avg_recommend as number | undefined, oldCount, ratingRecommend),
      });
    }

    tx.set(
      appStatsRef,
      {
        total_reviews: FieldValue.increment(1),
        total_locations: FieldValue.increment(exists ? 0 : 1),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    tx.set(userReviewRef, {
      uid_hash: uidHash,
      location_id: locationId,
      review_id: reviewId,
      created_at: FieldValue.serverTimestamp(),
    });

    tx.set(
      userRef,
      {
        review_count: FieldValue.increment(1),
        uid_hash: uidHash,
        my_reviews: FieldValue.arrayUnion({
          location_id: locationId,
          review_id: reviewId,
          company_name: companyName,
        }),
      },
      { merge: true },
    );

    return { success: true, review_id: reviewId };
  });
  });
  },
);
