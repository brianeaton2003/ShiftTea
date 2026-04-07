'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo } from 'react';
import { SubmitReviewForm, type SubmitReviewFormProps } from '@/components/SubmitReviewForm';
import { PATH_REVIEW_SELECT_LOCATION } from '@/lib/routes';
import { useAuthStore } from '@/lib/firebase/authStore';

function ReviewNewInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loadingAuth = useAuthStore((s) => s.loading);
  const locationId = searchParams.get('locationId') ?? '';
  const queryKey = useMemo(() => searchParams.toString(), [searchParams]);
  const resolved = useMemo<SubmitReviewFormProps | null>(() => {
    if (!locationId) return null;
    const companyName = searchParams.get('companyName') ?? '';
    if (!companyName) return null;
    return {
      locationId,
      companyName,
      address: searchParams.get('address') ?? '',
      city: searchParams.get('city') ?? '',
      zip: searchParams.get('zip') ?? '',
      category: searchParams.get('category') ?? 'business',
      lat: parseFloat(searchParams.get('lat') ?? '39.79'),
      lng: parseFloat(searchParams.get('lng') ?? '-74.97'),
    };
  }, [locationId, searchParams]);

  useEffect(() => {
    if (loadingAuth) return;
    if (!user) router.replace(`/auth/login?redirectTo=${encodeURIComponent(`/review/new/?${queryKey}`)}`);
  }, [loadingAuth, user, router, queryKey]);

  if (!user || loadingAuth) return <div className="h-36 bg-gray-100 rounded-xl animate-pulse" />;
  if (!locationId) return <button onClick={() => router.push(PATH_REVIEW_SELECT_LOCATION)} className="text-orange-500 text-sm font-medium">Pick a workplace first</button>;
  if (!resolved) return <button onClick={() => router.push(PATH_REVIEW_SELECT_LOCATION)} className="text-orange-500 text-sm font-medium">Pick a workplace first</button>;
  return <SubmitReviewForm {...resolved} />;
}

export default function ReviewNewPage() {
  return (
    <Suspense fallback={<div className="h-36 bg-gray-100 rounded-xl animate-pulse" />}>
      <ReviewNewInner />
    </Suspense>
  );
}
