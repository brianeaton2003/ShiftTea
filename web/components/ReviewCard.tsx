'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReviewDoc } from '@/lib/types';
import { formatRelativeTime } from '@/lib/formatters';
import { Timestamp } from 'firebase/firestore';
import { useId, useMemo, useState } from 'react';
import { useAuthStore } from '@/lib/authStore';
import { toggleReviewHelpful } from '@/lib/reviewService';
import { buildLocationHref } from '@/lib/routes';

interface Props {
  review: ReviewDoc;
  initialHelpful?: boolean;
  onHelpfulChange?: (helpful: boolean) => void;
}

function MiniStars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <svg key={s} width={12} height={12} viewBox="0 0 20 20"
          fill={s <= Math.round(value) ? '#f59e0b' : '#d1d5db'}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export function ReviewCard({ review, initialHelpful, onHelpfulChange }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);

  const redirectTo = useMemo(() => {
    const sp = searchParams?.toString();
    return sp ? `${pathname}?${sp}` : pathname ?? '/';
  }, [pathname, searchParams]);

  const [nsfwRevealed, setNsfwRevealed] = useState(false);
  const [helpful, setHelpful] = useState<boolean>(Boolean(initialHelpful));
  const [helpfulCount, setHelpfulCount] = useState<number>(Number(review.helpful_count ?? 0));
  const [helpfulBusy, setHelpfulBusy] = useState(false);
  const bodyId = useId();
  const date = review.created_at instanceof Timestamp
    ? review.created_at.toDate()
    : review.created_at
    ? new Date(review.created_at as unknown as string)
    : null;

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
      <div className="mb-2">
        <Link
          prefetch={false}
          href={buildLocationHref(review.location_id, review.company_name)}
          className="inline-flex items-center gap-1 text-sm font-semibold text-gray-900 hover:text-orange-500 transition-colors"
          aria-label={`View ${review.company_name} location page`}
        >
          <span>{review.company_name}</span>
          <svg
            width={14}
            height={14}
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
            className="text-orange-500"
          >
            <path
              d="M7 5h8v8M15 5l-9 9"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <p className="text-xs text-gray-400">{review.city}</p>
      </div>

      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {[1,2,3,4,5].map((s) => (
              <svg key={s} width={16} height={16} viewBox="0 0 20 20"
                fill={s <= Math.round(review.rating_overall) ? '#f59e0b' : '#d1d5db'}>
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="font-bold text-gray-900">{review.rating_overall.toFixed(1)}</span>
        </div>
        {date && (
          <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
            <svg width={12} height={12} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatRelativeTime(date)}
          </span>
        )}
      </div>

      {review.body && !review.nsfw && (
        <p className="text-sm text-gray-700 leading-relaxed mb-3">{review.body}</p>
      )}

      {review.body && review.nsfw && (
        <button
          type="button"
          onClick={() => setNsfwRevealed((prev) => !prev)}
          aria-controls={bodyId}
          aria-expanded={nsfwRevealed}
          className="text-left w-full mb-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          <div className="relative rounded-lg border border-orange-100 bg-orange-50/40 px-3 py-2">
            <p
              id={bodyId}
              className={[
                'text-sm text-gray-700 leading-relaxed',
                nsfwRevealed ? '' : 'blur-sm select-none',
              ].join(' ')}
            >
              {review.body}
            </p>

            {!nsfwRevealed && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-semibold text-orange-500 bg-white/90 border border-orange-100 rounded-full px-3 py-1 shadow-sm">
                  NSFW • Tap to reveal
                </span>
              </div>
            )}
            {nsfwRevealed && (
              <div className="mt-2">
                <span className="text-xs font-semibold text-orange-500 bg-white/90 border border-orange-100 rounded-full px-3 py-1 shadow-sm">
                  Tap to hide
                </span>
              </div>
            )}
          </div>
        </button>
      )}

      <div className="flex items-center justify-between gap-2 mb-3">
        <button
          type="button"
          disabled={helpfulBusy}
          onClick={async () => {
            if (!user) {
              router.push(`/account?redirectTo=${encodeURIComponent(redirectTo)}`);
              return;
            }
            const next = !helpful;
            setHelpful(next);
            setHelpfulCount((c) => Math.max(0, c + (next ? 1 : -1)));
            onHelpfulChange?.(next);

            setHelpfulBusy(true);
            try {
              const res = await toggleReviewHelpful({ location_id: review.location_id, review_id: review.review_id });
              setHelpful(Boolean(res.helpful));
              setHelpfulCount(Number(res.helpful_count ?? 0));
              onHelpfulChange?.(Boolean(res.helpful));
            } catch {
              setHelpful((cur) => !cur);
              setHelpfulCount((c) => Math.max(0, c + (next ? -1 : 1)));
              onHelpfulChange?.(!next);
            } finally {
              setHelpfulBusy(false);
            }
          }}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
            helpful
              ? 'border-orange-200 bg-orange-50 text-orange-700'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          } disabled:opacity-60`}
        >
          <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 9V5a3 3 0 00-6 0v4m-2 0h12l-1 11H7L6 9z"
            />
          </svg>
          This was helpful
        </button>
        <span className="text-xs text-gray-400">{helpfulCount}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2 border-t border-gray-50">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Management</p>
          <MiniStars value={review.rating_management} />
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Pay & Benefits</p>
          <MiniStars value={review.rating_pay} />
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Work-Life Balance</p>
          <MiniStars value={review.rating_worklife} />
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Breaks</p>
          <MiniStars value={review.rating_breaks} />
        </div>
      </div>

      {(review.pay_rate || review.tenure_months) && (
        <div className="flex gap-3 mt-2 pt-2 border-t border-gray-50">
          {review.pay_rate && (
            <span className="text-xs text-green-700 font-medium">${review.pay_rate}/hr</span>
          )}
          {review.tenure_months && (
            <span className="text-xs text-gray-400">{review.tenure_months} months</span>
          )}
        </div>
      )}
    </div>
  );
}
