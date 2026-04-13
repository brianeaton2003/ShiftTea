'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/firebase/authStore';
import { getUserReviews } from '@/lib/review/reviewService';
import { ReviewCard } from '@/components/ReviewCard';
import type { ReviewDoc } from '@/types';
import { buildLocationHref } from '@/lib/routes';

export default function MyReviewsPage() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewDoc[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login?redirectTo=%2Faccount%2Freviews%2F');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    getUserReviews().then(setReviews).finally(() => setFetchLoading(false));
  }, [user]);

  if (loading || !user || fetchLoading) return <div className="h-36 bg-gray-100 rounded-xl animate-pulse" />;

  return (
    <div className="lg:mx-auto lg:max-w-6xl">
      <div className="mb-6 flex items-center gap-2">
        <Link prefetch={false} href="/account/" className="p-1 text-gray-400 transition-colors hover:text-gray-600">
          <svg width={20} height={20} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-gray-900 lg:text-3xl">My Reviews</h1>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6 xl:grid-cols-3">
        {reviews.map((review) => (
          <div key={review.review_id} className="min-w-0">
            <Link
              prefetch={false}
              href={buildLocationHref(review.location_id, review.company_name)}
              className="mb-2 inline-block text-sm font-semibold text-gray-900 hover:text-orange-500 lg:text-base"
            >
              {review.company_name}
            </Link>
            <ReviewCard review={review} />
          </div>
        ))}
      </div>
      {reviews.length === 0 && <p className="text-sm text-gray-500">You have not written any reviews yet.</p>}
    </div>
  );
}
