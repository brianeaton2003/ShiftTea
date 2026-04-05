import { httpsCallable } from 'firebase/functions';
import { Timestamp } from 'firebase/firestore';
import { functions } from './firebase';
import type { ReviewDoc, SubmitReviewPayload } from './types';

function normalizeCallableReview(raw: Record<string, unknown>): ReviewDoc {
  let created_at: ReviewDoc['created_at'] = null;
  const c = raw.created_at;
  if (typeof c === 'string' && c) {
    created_at = Timestamp.fromDate(new Date(c));
  } else if (c && typeof c === 'object' && c !== null && 'seconds' in c) {
    const s = c as { seconds: number; nanoseconds?: number };
    created_at = new Timestamp(s.seconds, s.nanoseconds ?? 0);
  }
  return {
    review_id: String(raw.review_id),
    uid_hash: String(raw.uid_hash),
    created_at,
    rating_overall: Number(raw.rating_overall),
    rating_management: Number(raw.rating_management),
    rating_pay: Number(raw.rating_pay),
    rating_worklife: Number(raw.rating_worklife),
    rating_breaks: Number(raw.rating_breaks),
    rating_recommend: Number(raw.rating_recommend),
    pay_rate: raw.pay_rate !== undefined ? Number(raw.pay_rate) : undefined,
    tenure_months: raw.tenure_months !== undefined ? Number(raw.tenure_months) : undefined,
    body: raw.body !== undefined ? String(raw.body) : undefined,
    nsfw: raw.nsfw !== undefined ? Boolean(raw.nsfw) : undefined,
    helpful_count: raw.helpful_count !== undefined ? Number(raw.helpful_count) : undefined,
    company_name: String(raw.company_name),
    city: String(raw.city),
    location_id: String(raw.location_id),
  };
}

export async function submitReview(payload: SubmitReviewPayload): Promise<{ success: boolean; review_id: string }> {
  const fn = httpsCallable(functions, 'submitReview');
  const result = await fn(payload);
  return result.data as { success: boolean; review_id: string };
}

export async function getUserReviews(): Promise<ReviewDoc[]> {
  const fn = httpsCallable(functions, 'getUserReviews');
  const result = await fn({});
  const list = (result.data as { reviews?: unknown[] }).reviews ?? [];
  return list
    .filter((r): r is Record<string, unknown> => r !== null && typeof r === 'object')
    .map((r) => normalizeCallableReview(r));
}

export async function toggleReviewHelpful(payload: {
  location_id: string;
  review_id: string;
}): Promise<{ helpful: boolean; helpful_count: number }> {
  const fn = httpsCallable(functions, 'toggleReviewHelpful');
  const result = await fn(payload);
  return result.data as { helpful: boolean; helpful_count: number };
}

export async function getHelpfulVotesForLocation(payload: {
  location_id: string;
}): Promise<{ review_ids: string[] }> {
  const fn = httpsCallable(functions, 'getHelpfulVotesForLocation');
  const result = await fn(payload);
  return result.data as { review_ids: string[] };
}

export function isAlreadyReviewedError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'code' in err) {
    if ((err as { code?: string }).code === 'functions/already-exists') return true;
  }
  if (err && typeof err === 'object' && 'message' in err) {
    if (String((err as { message?: string }).message).includes('already-reviewed')) return true;
  }
  return false;
}
