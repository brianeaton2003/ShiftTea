'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/authStore';
import { getUserReviews } from '@/lib/reviewService';
import { ReviewCard } from '@/components/ReviewCard';
import type { ReviewDoc } from '@/lib/types';
import { buildLocationHref } from '@/lib/routes';

export default function MyReviewsPage() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const router = useRouter();

  const [reviews, setReviews] = useState<ReviewDoc[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/account?redirectTo=${encodeURIComponent('/account/reviews')}`);
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setFetchLoading(true);
    getUserReviews()
      .then((data) => setReviews(data))
      .catch(() => setError('Could not load your reviews. Try again later.'))
      .finally(() => setFetchLoading(false));
  }, [user]);

  if (loading || (!user && !error)) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-36 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link prefetch={false} href="/account" className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
          <svg width={20} height={20} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">My Reviews</h1>
      </div>

      {fetchLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-36 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm mb-3">{error}</p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setFetchLoading(true);
              getUserReviews()
                .then((data) => setReviews(data))
                .catch(() => setError('Could not load your reviews. Try again later.'))
                .finally(() => setFetchLoading(false));
            }}
            className="text-sm text-orange-500 font-medium hover:text-orange-600 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!fetchLoading && !error && reviews.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm mb-4">You haven&apos;t written any reviews yet.</p>
          <Link
            prefetch={false}
            href="/locations/"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            Find a location to review
          </Link>
        </div>
      )}

      {!fetchLoading && !error && reviews.length > 0 && (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.review_id}>
              <Link
                prefetch={false}
                href={buildLocationHref(review.location_id, review.company_name)}
                className="flex items-center justify-between px-1 mb-1.5 group"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-orange-500 transition-colors">
                    {review.company_name}
                  </p>
                  <p className="text-xs text-gray-400">{review.city}, NJ</p>
                </div>
                <svg
                  width={14}
                  height={14}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="text-gray-300 group-hover:text-orange-400 transition-colors shrink-0"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <ReviewCard review={review} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
