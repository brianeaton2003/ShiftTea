'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Timestamp, collectionGroup, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppStatsDoc, ReviewDoc } from '@/lib/types';
import Image from 'next/image';
import { ReviewCard } from '@/components/ReviewCard';
import { AdPlaceholder } from '@/components/AdPlaceholder';

const HOME_CACHE_KEY = 'shifttea_home_v2';
const HOME_CACHE_TTL_MS = 3 * 60 * 1000;
const USE_EMULATORS = process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === 'true';

type CachedReview = Omit<ReviewDoc, 'created_at'> & { created_at_ms: number | null };
type HomeCache = { recentReviews: CachedReview[]; stats: AppStatsDoc; cachedAt: number };

function mapReview(id: string, data: Record<string, unknown>): ReviewDoc {
  return {
    review_id: id,
    uid_hash: String(data.uid_hash),
    created_at: (data.created_at ?? null) as ReviewDoc['created_at'],
    rating_overall: Number(data.rating_overall),
    rating_management: Number(data.rating_management),
    rating_pay: Number(data.rating_pay),
    rating_worklife: Number(data.rating_worklife),
    rating_breaks: Number(data.rating_breaks),
    rating_recommend: Number(data.rating_recommend),
    pay_rate: data.pay_rate !== undefined && data.pay_rate !== null ? Number(data.pay_rate) : undefined,
    tenure_months:
      data.tenure_months !== undefined && data.tenure_months !== null ? Number(data.tenure_months) : undefined,
    body: data.body !== undefined && data.body !== null ? String(data.body) : undefined,
    nsfw: data.nsfw !== undefined && data.nsfw !== null ? Boolean(data.nsfw) : undefined,
    helpful_count: data.helpful_count !== undefined && data.helpful_count !== null ? Number(data.helpful_count) : undefined,
    company_name: String(data.company_name),
    city: String(data.city),
    location_id: String(data.location_id),
  };
}

function serializeReview(review: ReviewDoc): CachedReview {
  const created_at_ms =
    review.created_at instanceof Timestamp
      ? review.created_at.toMillis()
      : review.created_at
        ? new Date(review.created_at as unknown as string).getTime()
        : null;

  const { created_at, ...rest } = review;
  // Firestore Timestamp objects are not JSON-stable; we cache via `created_at_ms` only.
  void created_at;
  return { ...rest, created_at_ms };
}

function deserializeReview(cached: CachedReview): ReviewDoc {
  return {
    ...cached,
    created_at:
      cached.created_at_ms === null || cached.created_at_ms === undefined
        ? null
        : Timestamp.fromMillis(cached.created_at_ms),
  };
}

function readHomeCache(): HomeCache | null {
  try {
    const raw = sessionStorage.getItem(HOME_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HomeCache;
    if (Date.now() - parsed.cachedAt > HOME_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeHomeCache(recentReviews: ReviewDoc[], stats: AppStatsDoc) {
  try {
    sessionStorage.setItem(
      HOME_CACHE_KEY,
      JSON.stringify({
        recentReviews: recentReviews.map(serializeReview),
        stats,
        cachedAt: Date.now(),
      }),
    );
  } catch {
    /* ignore */
  }
}

export default function HomePage() {
  const [recentReviews, setRecentReviews] = useState<ReviewDoc[]>([]);
  const [stats, setStats] = useState<AppStatsDoc>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!USE_EMULATORS) {
      const cached = readHomeCache();
      if (cached) {
        setError(null);
        setRecentReviews(cached.recentReviews.map(deserializeReview));
        setStats(cached.stats);
        setLoading(false);
        return;
      }
    }
    (async () => {
      try {
        const q = query(collectionGroup(db, 'reviews'), orderBy('created_at', 'desc'), limit(3));
        const [reviewsSnap, statsSnap] = await Promise.all([getDocs(q), getDoc(doc(db, 'app_stats', 'global'))]);
        const reviews = reviewsSnap.docs.map((d) => mapReview(d.id, d.data() as Record<string, unknown>)).slice(0, 3);
        const statsData = statsSnap.exists() ? (statsSnap.data() as AppStatsDoc) : {};

        setRecentReviews(reviews);
        setStats(statsData);
        if (!USE_EMULATORS) writeHomeCache(reviews, statsData);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
        setRecentReviews([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <div className="bg-amber-50 rounded-2xl p-6 text-center mb-6 border border-amber-100">
        <div className="flex justify-center mb-4">
          <Image src="/logo.png" alt="ShiftTea logo" width={120} height={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-5">Review Your Employer</h1>
        
        <div className="mx-auto mt-1 w-fit max-w-full bg-white/75 border border-white/60 rounded-xl px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(0,0,0,0.03)]">
          <p className="text-gray-500 text-sm">Tell us why we should work there</p>
        </div>
        <p className="text-gray-500 text-sm italic mt-2">or</p>
        <div className="mx-auto mt-2 w-fit max-w-full bg-white/75 border border-white/60 rounded-xl px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(0,0,0,0.03)]">
          <p className="text-gray-500 text-sm">Tell us why we shouldn&apos;t</p>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-5">
          <div className="bg-white rounded-xl border border-amber-100 shadow-sm px-3 py-3">
            <p className="text-xl font-bold text-orange-500 leading-none">{stats.total_reviews ?? '—'}</p>
            <p className="text-[11px] text-gray-500 mt-1">Reviews</p>
          </div>
          <div className="bg-white rounded-xl border border-amber-100 shadow-sm px-3 py-3">
            <p className="text-xl font-bold text-orange-500 leading-none">{stats.total_locations ?? '50+'}</p>
            <p className="text-[11px] text-gray-500 mt-1">Locations</p>
          </div>
          <div className="bg-white rounded-xl border border-amber-100 shadow-sm px-3 py-3">
            <p className="text-xl font-bold text-orange-500 leading-none">100%</p>
            <p className="text-[11px] text-gray-500 mt-1">Anonymous</p>
          </div>
        </div>
      </div>

      <Link
        prefetch={false}
        href="/locations/"
        className="flex items-center gap-3 w-full bg-white border border-gray-200 rounded-xl px-4 py-3 mb-6 shadow-sm hover:shadow-md transition-shadow text-gray-400"
      >
        <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-sm">Search South Jersey employers…</span>
      </Link>

      <AdPlaceholder slot="feed" />

      <div className="mb-3 mt-6 flex items-center gap-2">
        <h2 className="font-bold text-gray-900">Recent Reviews</h2>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 h-24 animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-1">Could not load recent reviews</p>
          <p className="text-sm">{error}</p>
          <Link prefetch={false} href="/locations/" className="mt-4 inline-block text-orange-500 font-medium text-sm">
            Find a workplace →
          </Link>
        </div>
      ) : recentReviews.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-1">No reviews yet</p>
          <p className="text-sm">Be the first to review a South Jersey employer.</p>
          <Link prefetch={false} href="/locations/" className="mt-4 inline-block text-orange-500 font-medium text-sm">
            Find a workplace →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {recentReviews.map((review) => (
            <ReviewCard key={review.review_id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}
