'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, Suspense, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Timestamp, collectionGroup, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import type { AppStatsDoc, ReviewDoc } from '@/types';
import { ReviewCard } from '@/components/ReviewCard';

const HOME_CACHE_KEY = 'shifttea_home_v2';
const HOME_CACHE_TTL_MS = 3 * 60 * 1000;
const USE_EMULATORS = process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === 'true';

const HOME_STAT_COUNT_DISPLAY_BRACKETS = {
  reviews: [
    100, 250, 500, 1000, 2000, 2500, 5000, 10000, 15000, 20000, 25000, 50000, 100000,
  ],
  locations: [
    100, 250, 500, 1000, 2000, 2500, 5000, 10000, 15000, 20000, 25000, 50000, 100000,
  ],
} as const satisfies Record<'reviews' | 'locations', readonly number[]>;

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

function formatStatCountFromBrackets(n: number, brackets: readonly number[]): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  let tier: number | undefined;
  for (const b of brackets) {
    if (n >= b) tier = b;
    else break;
  }
  return tier !== undefined ? `${tier}+` : String(Math.trunc(n));
}

function buildStatCountDisplayMap(stats: AppStatsDoc): { reviews: string; locations: string } {
  return {
    reviews:
      stats.total_reviews === undefined || stats.total_reviews === null
        ? '—'
        : formatStatCountFromBrackets(stats.total_reviews, HOME_STAT_COUNT_DISPLAY_BRACKETS.reviews),
    locations:
      stats.total_locations === undefined || stats.total_locations === null
        ? '50+'
        : formatStatCountFromBrackets(stats.total_locations, HOME_STAT_COUNT_DISPLAY_BRACKETS.locations),
  };
}

function StatTile({
  value,
  label,
  icon,
  loading = false,
}: {
  value: string;
  label: string;
  icon: ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2.5 sm:gap-3 md:gap-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-500 sm:h-16 sm:w-16 md:h-[4.5rem] md:w-[4.5rem] lg:h-20 lg:w-20 [&_svg]:h-5 [&_svg]:w-5 sm:[&_svg]:h-6 sm:[&_svg]:w-6 md:[&_svg]:h-7 md:[&_svg]:w-7 lg:[&_svg]:h-8 lg:[&_svg]:w-8">
        {icon}
      </div>
      <div className="min-w-0 text-center">
        {loading ? (
          <div
            className="mb-0.5 flex h-10 items-center justify-center sm:h-11 md:mb-1 md:h-12 lg:h-14"
            role="status"
            aria-label={`Loading ${label}`}
          >
            <span className="sr-only">Loading {label}</span>
            <span
              className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-orange-200 border-t-orange-500 sm:h-8 sm:w-8 md:h-9 md:w-9 lg:h-10 lg:w-10"
              aria-hidden
            />
          </div>
        ) : (
          <p className="mb-0.5 text-lg font-bold tabular-nums leading-none tracking-tighter text-orange-500 sm:text-2xl md:mb-1 md:text-3xl lg:text-5xl">
            {value}
          </p>
        )}
        <p className="text-sm font-medium leading-tight text-gray-500 sm:text-base md:text-lg">{label}</p>
      </div>
    </div>
  );
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

  const statCountDisplay = useMemo(() => buildStatCountDisplayMap(stats), [stats]);

  const bleedX = '-mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8';

  return (
    <Suspense>
      <div className="w-full">
        <section className={`bg-orange-50 py-16 pt-4 sm:pt-20 sm:pb-14 md:pt-32 md:pb-12 ${bleedX} lg:pb-10 lg:pt-4`}>
          <div className="mx-auto max-w-7xl text-center">
            <motion.div
              className="mb-6 sm:mb-8 lg:mb-10"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="mb-3 px-1 text-4xl font-bold leading-tight text-gray-900 sm:mb-4 sm:text-5xl md:text-6xl xl:text-7xl">
                Review Your Employer
              </h1>
              <p className="mx-auto mb-2 max-w-2xl px-4 text-base text-gray-500 sm:text-lg md:text-xl lg:text-xl">
                Tell us why we should work there
              </p>
              <p className="text-xs italic text-gray-500 sm:text-sm">or</p>
              <p className="mx-auto mt-2 max-w-2xl px-4 text-base text-gray-500 sm:text-lg md:text-xl lg:text-xl">
                Tell us why we shouldn&apos;t
              </p>
            </motion.div>

            <motion.div
              className="relative mx-auto mb-10 w-full max-w-2xl sm:mb-12"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Link
                prefetch={false}
                href="/locations/"
                className="flex h-14 w-full items-center gap-3 rounded-2xl border-2 border-black/10 bg-white pl-5 pr-6 text-left text-base text-gray-500 shadow-sm transition-all hover:border-orange-500 hover:shadow-md"
              >
                <svg width={20} height={20} fill="none" viewBox="0 0 24 24" stroke="currentColor" className="shrink-0">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <span>Search South Jersey employers…</span>
              </Link>
            </motion.div>

            <div className="mx-auto grid max-w-4xl grid-cols-3 gap-1 px-0 py-2 sm:gap-8 sm:px-0 sm:py-4 md:gap-12 lg:pt-6 lg:pb-0">
              <StatTile
                loading={loading}
                value={statCountDisplay.reviews}
                label="Reviews"
                icon={
                  <svg className="shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                }
              />
              <StatTile
                loading={loading}
                value={statCountDisplay.locations}
                label="Locations"
                icon={
                  <svg className="shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              />
              <StatTile
                value="100%"
                label="Anonymous"
                icon={
                  <svg className="shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                }
              />
            </div>
          </div>
        </section>

        <section id="reviews" className={`bg-orange-50 pt-6 pb-12 sm:pt-10 sm:pb-16 lg:pt-10 lg:pb-20 ${bleedX}`}>
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 text-center sm:mb-12 lg:mb-12">
              <h2 className="mb-2 text-2xl font-bold text-gray-900 sm:mb-4 sm:text-3xl md:text-4xl lg:text-4xl">
                Recent Reviews
              </h2>
              <p className="text-sm text-gray-500 sm:text-base">Real experiences from workers like you</p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 animate-pulse rounded-2xl border border-gray-100 bg-gray-50" />
                ))}
              </div>
            ) : error ? (
              <div className="py-12 text-center text-gray-400">
                <p className="mb-1 text-lg">Could not load recent reviews</p>
                <p className="text-sm">{error}</p>
                <Link prefetch={false} href="/locations/" className="mt-4 inline-block text-sm font-medium text-orange-500">
                  Find a workplace →
                </Link>
              </div>
            ) : recentReviews.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <p className="mb-1 text-lg">No reviews yet</p>
                <p className="text-sm">Be the first to review a South Jersey employer.</p>
                <Link prefetch={false} href="/locations/" className="mt-4 inline-block text-sm font-medium text-orange-500">
                  Find a workplace →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                {recentReviews.map((review) => (
                  <ReviewCard key={review.review_id} review={review} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className={`bg-orange-50 py-12 sm:py-20 ${bleedX} lg:py-20`}>
          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="mb-3 text-2xl font-bold text-gray-900 sm:mb-4 sm:text-3xl md:text-4xl lg:text-4xl">
                Your voice matters
              </h2>
              <p className="mx-auto mb-6 max-w-2xl px-4 text-base text-gray-500 sm:mb-8 sm:text-lg lg:text-lg">
                Help others find great workplaces. Share your experience anonymously and make a difference for the next
                generation of workers.
              </p>
              <Link
                prefetch={false}
                href="/review/select-location/"
                className="inline-block rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 sm:px-8 sm:py-4 sm:text-base"
              >
                Write a Review
              </Link>
            </motion.div>
          </div>
        </section>
      </div>
    </Suspense>
  );
}
