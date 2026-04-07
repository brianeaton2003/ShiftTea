import * as admin from 'firebase-admin';
import { isFirestoreMetricsEnabled } from './devMetrics/config.js';
import { wrapFirestore } from './devMetrics/wrapFirestore.js';

if (!admin.apps.length) {
  admin.initializeApp();
}

const rawDb = admin.firestore();

/** Shared Firestore instance for all Cloud Functions (optionally wrapped for dev metrics). */
export const db = isFirestoreMetricsEnabled() ? wrapFirestore(rawDb) : rawDb;
