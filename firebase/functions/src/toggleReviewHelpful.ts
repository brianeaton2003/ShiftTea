import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { callableAppCheckEnforced } from './appCheckUtil.js';
import { hashUid } from './utils/hash.js';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

type Payload = { location_id?: unknown; review_id?: unknown };

export const toggleReviewHelpful = onCall(
  {
    region: 'us-central1',
    maxInstances: 10,
    cors: true,
    invoker: 'public',
    enforceAppCheck: callableAppCheckEnforced(),
  },
  async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const uid = request.auth.uid;
  const uidHash = hashUid(uid);
  const data = (request.data ?? {}) as Payload;

  const locationId = String(data.location_id ?? '').trim();
  const reviewId = String(data.review_id ?? '').trim();
  if (!locationId || !reviewId) {
    throw new HttpsError('invalid-argument', 'missing-location-or-review');
  }

  const reviewRef = db.collection('locations').doc(locationId).collection('reviews').doc(reviewId);
  const voteRef = db
    .collection('review_helpful_votes')
    .doc(`${uidHash}_${locationId}_${reviewId}`);

  return await db.runTransaction(async (tx) => {
    const [reviewSnap, voteSnap] = await Promise.all([tx.get(reviewRef), tx.get(voteRef)]);
    if (!reviewSnap.exists) {
      throw new HttpsError('not-found', 'review-not-found');
    }

    const reviewData = reviewSnap.data() ?? {};
    const currentCount = Number(reviewData.helpful_count ?? 0) || 0;
    const authorUidHash = String(reviewData.uid_hash ?? '');
    if (authorUidHash && authorUidHash === uidHash) {
      throw new HttpsError('failed-precondition', 'cannot-upvote-own-review');
    }

    if (voteSnap.exists) {
      // remove vote
      tx.delete(voteRef);
      tx.update(reviewRef, { helpful_count: FieldValue.increment(-1) });
      return { helpful: false, helpful_count: Math.max(0, currentCount - 1) };
    }

    tx.set(voteRef, {
      uid_hash: uidHash,
      location_id: locationId,
      review_id: reviewId,
      created_at: FieldValue.serverTimestamp(),
    });
    tx.update(reviewRef, { helpful_count: FieldValue.increment(1) });
    return { helpful: true, helpful_count: currentCount + 1 };
  });
});

