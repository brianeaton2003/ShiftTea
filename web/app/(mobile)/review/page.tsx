'use client';

import { doc, getDoc } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { FindWorkplaceForm } from '@/components/FindWorkplaceForm';
import { SubmitReviewForm, type SubmitReviewFormProps } from '@/components/SubmitReviewForm';
import { db } from '@/lib/firebase';
import { buildReviewHref, PATH_REVIEW_INDEX } from '@/lib/routes';
import { useAuthStore } from '@/lib/authStore';

function ReviewPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loadingAuth = useAuthStore((s) => s.loading);

  const locationId = searchParams.get('locationId') ?? '';
  const companyName = searchParams.get('companyName') ?? '';
  const queryKey = useMemo(() => searchParams.toString(), [searchParams]);

  const [resolved, setResolved] = useState<SubmitReviewFormProps | null | undefined>(undefined);

  const reviewReturnPath = useMemo(
    () => (queryKey.length > 0 ? buildReviewHref(Object.fromEntries(searchParams.entries())) : PATH_REVIEW_INDEX),
    [queryKey, searchParams],
  );

  useEffect(() => {
    if (loadingAuth) return;
    if (!user) {
      router.replace(`/account?redirectTo=${encodeURIComponent(reviewReturnPath)}`);
    }
  }, [loadingAuth, user, router, reviewReturnPath]);

  useEffect(() => {
    if (!locationId) {
      setResolved(null);
      return;
    }

    if (companyName) {
      setResolved({
        locationId,
        companyName,
        address: searchParams.get('address') ?? '',
        city: searchParams.get('city') ?? '',
        zip: searchParams.get('zip') ?? '',
        category: searchParams.get('category') ?? 'business',
        lat: parseFloat(searchParams.get('lat') ?? '39.79'),
        lng: parseFloat(searchParams.get('lng') ?? '-74.97'),
      });
      return;
    }

    let cancelled = false;
    (async () => {
      const snap = await getDoc(doc(db, 'locations', locationId));
      if (cancelled) return;
      if (!snap.exists()) {
        setResolved(null);
        return;
      }
      const d = snap.data();
      const gp = d.geo_point as { latitude?: number; longitude?: number } | undefined;
      setResolved({
        locationId,
        companyName: String(d.company_name ?? ''),
        address: String(d.address ?? ''),
        city: String(d.city ?? ''),
        zip: String(d.zip ?? ''),
        category: String(d.category ?? 'business'),
        lat: gp && typeof gp.latitude === 'number' ? gp.latitude : 39.79,
        lng: gp && typeof gp.longitude === 'number' ? gp.longitude : -74.97,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [locationId, companyName, queryKey, searchParams]);

  const BackButton = (
    <button
      type="button"
      onClick={() => router.push('/')}
      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
      aria-label="Back to home"
    >
      <svg width={20} height={20} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );

  if (loadingAuth) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">{BackButton}</div>
        <div className="h-8 bg-gray-100 rounded animate-pulse w-48" />
        <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">{BackButton}</div>
        <div className="h-8 bg-gray-100 rounded animate-pulse w-48" />
        <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!locationId) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          {BackButton}
          <h1 className="text-xl font-bold text-gray-900">Leave a review</h1>
        </div>
        <p className="text-sm text-gray-400 mb-4">Search for your workplace below.</p>
        <FindWorkplaceForm variant="review" />
      </div>
    );
  }

  if (resolved === undefined) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">{BackButton}</div>
        <div className="h-8 bg-gray-100 rounded animate-pulse w-48" />
        <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!resolved) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">{BackButton}</div>
        <div className="text-center py-12 text-gray-400">
          <p className="mb-3">We couldn&apos;t load that location.</p>
          <button
            type="button"
            onClick={() => router.push(PATH_REVIEW_INDEX)}
            className="text-orange-500 text-sm font-medium"
          >
            Pick another workplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SubmitReviewForm {...resolved} />
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-8 bg-gray-100 rounded animate-pulse w-48" />
        </div>
      }
    >
      <ReviewPageInner />
    </Suspense>
  );
}
