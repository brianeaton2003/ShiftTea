'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, useCallback, useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { ReviewCard } from '@/components/ReviewCard';
import { AdPlaceholder } from '@/components/AdPlaceholder';
import { db } from '@/lib/firebase';
import { avgLabel } from '@/lib/formatters';
import type { LocationDoc, ReviewDoc } from '@/lib/types';
import { useAuthStore } from '@/lib/authStore';
import { getHelpfulVotesForLocation } from '@/lib/reviewService';

const PAGE_SIZE = 5;

function mapReview(id: string, data: Record<string, unknown>): ReviewDoc {
  return {
    review_id: id,
    uid_hash: String(data.uid_hash),
    created_at: data.created_at as ReviewDoc['created_at'],
    rating_overall: Number(data.rating_overall),
    rating_management: Number(data.rating_management),
    rating_pay: Number(data.rating_pay),
    rating_worklife: Number(data.rating_worklife),
    rating_breaks: Number(data.rating_breaks),
    rating_recommend: Number(data.rating_recommend),
    pay_rate: data.pay_rate as number | undefined,
    tenure_months: data.tenure_months as number | undefined,
    body: data.body as string | undefined,
    nsfw: data.nsfw as boolean | undefined,
    helpful_count: data.helpful_count as number | undefined,
    company_name: String(data.company_name),
    city: String(data.city),
    location_id: String(data.location_id),
  };
}

const BREAKDOWN_ROWS = [
  { key: 'avg_rating', label: 'Overall' },
  { key: 'avg_management', label: 'Management' },
  { key: 'avg_pay', label: 'Pay & Benefits' },
  { key: 'avg_worklife', label: 'Work-Life Balance' },
  { key: 'avg_breaks', label: 'Break Policy' },
  { key: 'avg_recommend', label: 'Would Recommend' },
] as const;

type SortKey = 'created_desc' | 'created_asc' | 'rating_desc' | 'rating_asc' | 'helpful_desc';

export function LocationDetailView({ id }: { id: string }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [location, setLocation] = useState<LocationDoc | null>(null);
  const [reviews, setReviews] = useState<ReviewDoc[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sort, setSort] = useState<SortKey>('created_desc');
  const [helpfulVotes, setHelpfulVotes] = useState<Set<string>>(() => new Set());

  const loadLocation = useCallback(async () => {
    const snap = await getDoc(doc(db, 'locations', id));
    if (!snap.exists()) {
      setLocation(null);
      return;
    }
    const d = snap.data();
    const gp = d.geo_point as { latitude?: number; longitude?: number } | undefined;
    setLocation({
      location_id: id,
      company_name: d.company_name ?? '',
      address: d.address ?? '',
      city: d.city ?? '',
      zip: d.zip ?? '',
      category: d.category ?? '',
      avg_rating: d.avg_rating ?? 0,
      avg_management: d.avg_management,
      avg_pay: d.avg_pay,
      avg_worklife: d.avg_worklife,
      avg_breaks: d.avg_breaks,
      avg_recommend: d.avg_recommend,
      review_count: d.review_count ?? 0,
      geo_point:
        gp && typeof gp.latitude === 'number'
          ? { latitude: gp.latitude, longitude: gp.longitude! }
          : undefined,
    });
  }, [id]);

  const loadReviews = useCallback(
    async (cursor: QueryDocumentSnapshot | null, append: boolean, sortKey: SortKey) => {
      const base = collection(db, 'locations', id, 'reviews');
      const [orderField, orderDir] =
        sortKey === 'created_desc'
          ? (['created_at', 'desc'] as const)
          : sortKey === 'created_asc'
            ? (['created_at', 'asc'] as const)
            : sortKey === 'rating_desc'
              ? (['rating_overall', 'desc'] as const)
              : sortKey === 'rating_asc'
                ? (['rating_overall', 'asc'] as const)
                : (['helpful_count', 'desc'] as const);

      const q = cursor
        ? query(base, orderBy(orderField, orderDir), startAfter(cursor), limit(PAGE_SIZE))
        : query(base, orderBy(orderField, orderDir), limit(PAGE_SIZE));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => mapReview(d.id, d.data() as Record<string, unknown>));
      setReviews((prev) => (append ? [...prev, ...list] : list));
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    },
    [id],
  );

  useEffect(() => {
    if (!user) {
      setHelpfulVotes(new Set());
      return;
    }
    let cancelled = false;
    getHelpfulVotesForLocation({ location_id: id })
      .then((res) => {
        if (!cancelled) setHelpfulVotes(new Set(res.review_ids ?? []));
      })
      .catch(() => {
        if (!cancelled) setHelpfulVotes(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [user, id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await loadLocation();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadLocation]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingReviews(true);
      setReviews([]);
      setLastDoc(null);
      setHasMore(true);
      try {
        await loadReviews(null, false, sort);
      } finally {
        if (!cancelled) setLoadingReviews(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sort, loadReviews]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-64 animate-pulse rounded bg-gray-100" />
        <div className="h-32 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="py-16 text-center text-gray-400">
        <p className="mb-2 text-lg">Location not found</p>
        <Link prefetch={false} href="/locations/" className="text-sm font-medium text-orange-500">
          Search again →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => router.push('/locations/')}
        className="mb-4 flex items-center gap-1 text-sm text-gray-400 transition-colors hover:text-gray-600"
      >
        <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Search
      </button>

      <div className="mb-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h1 className="text-xl font-bold text-gray-900">{location.company_name}</h1>
          <span className="shrink-0 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-0.5 text-xs font-medium capitalize text-amber-700">
            {location.category}
          </span>
        </div>
        <div className="mb-1 flex items-center gap-1 text-sm text-gray-400">
          <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{location.address}</span>
        </div>
        {location.city && <p className="text-sm font-medium text-orange-500">{location.city}, NJ {location.zip}</p>}
      </div>

      <div className="mb-4 rounded-xl border border-gray-100 bg-white p-5 text-center shadow-sm">
        <p className="mb-1 text-6xl font-bold text-orange-500">{avgLabel(location.avg_rating)}</p>
        <div className="mb-2 flex justify-center">
          {[1, 2, 3, 4, 5].map((s) => (
            <svg key={s} width={24} height={24} viewBox="0 0 20 20" fill={s <= Math.round(location.avg_rating) ? '#f59e0b' : '#d1d5db'}>
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <p className="text-sm text-gray-400">
          Based on {location.review_count} anonymous review{location.review_count === 1 ? '' : 's'}
        </p>
      </div>

      <div className="mb-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-bold text-gray-900">Rating Breakdown</h2>
        <div className="space-y-2.5">
          {BREAKDOWN_ROWS.map(({ key, label }) => {
            const val = key === 'avg_rating' ? location.avg_rating : location[key];
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-sm text-gray-600">{label}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg key={s} width={14} height={14} viewBox="0 0 20 20" fill={s <= Math.round(val ?? 0) ? '#f59e0b' : '#d1d5db'}>
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm font-semibold text-gray-700">{avgLabel(val)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <AdPlaceholder slot="feed" />

      <div className="mb-3 mt-4 flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Reviews ({location.review_count})</h2>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          <option value="helpful_desc">Most helpful</option>
          <option value="rating_desc">Highest to Lowest Rated</option>
          <option value="rating_asc">Lowest to Highest Rated</option>
          <option value="created_desc">Most Recent</option>
          <option value="created_asc">Oldest</option>
        </select>
      </div>

      <div className="space-y-3">
        {loadingReviews ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-200 border-t-orange-500" aria-label="Loading reviews" />
          </div>
        ) : (
          reviews.map((r, i) => (
            <Fragment key={r.review_id}>
              <ReviewCard
                review={r}
                initialHelpful={helpfulVotes.has(r.review_id)}
                onHelpfulChange={(next) => {
                  setHelpfulVotes((prev) => {
                    const n = new Set(prev);
                    if (next) n.add(r.review_id);
                    else n.delete(r.review_id);
                    return n;
                  });
                }}
              />
              {(i + 1) % 3 === 0 && i < reviews.length - 1 && (
                <AdPlaceholder slot="in-review" />
              )}
            </Fragment>
          ))
        )}
      </div>

      {hasMore && !loadingReviews && (
        <button
          type="button"
          onClick={async () => {
            if (!lastDoc || loadingMore) return;
            setLoadingMore(true);
            try {
              await loadReviews(lastDoc, true, sort);
            } finally {
              setLoadingMore(false);
            }
          }}
          disabled={loadingMore}
          className="mt-4 w-full rounded-xl border border-orange-200 py-3 text-sm font-semibold text-orange-500 transition-colors hover:bg-orange-50 disabled:opacity-50"
        >
          {loadingMore ? 'Loading…' : 'Next page'}
        </button>
      )}

      {reviews.length === 0 && !loading && (
        <p className="py-8 text-center text-sm text-gray-400">No reviews yet. Be the first!</p>
      )}
    </div>
  );
}

