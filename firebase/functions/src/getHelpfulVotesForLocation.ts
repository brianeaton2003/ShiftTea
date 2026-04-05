import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { callableAppCheckEnforced } from './appCheckUtil.js';
import { runWithMetrics } from './devMetrics/context.js';
import { hashUid } from './utils/hash.js';
import { db } from './firestoreDb.js';

type Payload = { location_id?: unknown };

export const getHelpfulVotesForLocation = onCall(
  {
    region: 'us-central1',
    maxInstances: 10,
    cors: true,
    invoker: 'public',
    enforceAppCheck: callableAppCheckEnforced(),
  },
  async (request) => {
  return runWithMetrics('getHelpfulVotesForLocation', async () => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const uid = request.auth.uid;
  const uidHash = hashUid(uid);
  const data = (request.data ?? {}) as Payload;
  const locationId = String(data.location_id ?? '').trim();
  if (!locationId) throw new HttpsError('invalid-argument', 'missing-location');

  const snap = await db
    .collection('review_helpful_votes')
    .where('uid_hash', '==', uidHash)
    .where('location_id', '==', locationId)
    .limit(250)
    .get();

  const review_ids: string[] = [];
  for (const d of snap.docs) {
    const rid = String(d.data().review_id ?? '').trim();
    if (rid) review_ids.push(rid);
  }

  return { review_ids };
  });
  },
);

