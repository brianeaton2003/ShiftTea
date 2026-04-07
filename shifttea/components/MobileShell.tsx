'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { type ReactNode } from 'react';
import { Navbar } from '@/components/Navbar';

/** Extra bottom padding so content clears the fixed “Write a review” bar. */
const CTA_BOTTOM_PAD = 'pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-8';

export function MobileShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/';
  const searchParams = useSearchParams();
  const showReviewCta = !pathname.startsWith('/review');
  const contentBottomPad = showReviewCta ? CTA_BOTTOM_PAD : 'pb-6';

  // With `trailingSlash: true`, location list/detail layouts use `/locations/`, not `/locations`.
  const pathnameNorm = (pathname ?? '/').replace(/\/+$/, '') || '/';
  const locationIdFromPath = /^\/locations\/(.+)$/.exec(pathnameNorm)?.[1];
  const locationIdFromQuery =
    pathnameNorm === '/locations' ? searchParams.get('locationId')?.trim() ?? '' : '';
  const locationDetailId = locationIdFromPath ?? locationIdFromQuery ?? '';
  const companyNameParam = searchParams.get('companyName')?.trim() ?? '';
  const reviewHref = locationDetailId
    ? `/review/new/?locationId=${encodeURIComponent(locationDetailId)}${
        companyNameParam ? `&companyName=${encodeURIComponent(companyNameParam)}` : ''
      }`
    : '/review/select-location/';

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-hidden bg-[var(--background)]">
      <Navbar />

      <motion.div
        key={pathname}
        initial={{ opacity: 0.88, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <div className="min-h-0 flex-1 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
          <div className={`px-4 pt-4 md:px-6 lg:px-8 ${contentBottomPad}`}>{children}</div>
        </div>
      </motion.div>

      {showReviewCta && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center lg:hidden">
          <div className="pointer-events-auto w-full max-w-5xl border-t border-gray-100 bg-white/95 px-4 pt-3 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur supports-[backdrop-filter]:bg-white/90 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6 lg:px-8">
            <Link
              prefetch={false}
              href={reviewHref}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-4 text-base font-bold text-white shadow-md transition-colors hover:bg-orange-600 active:bg-orange-600"
            >
              <svg width={22} height={22} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Write a review
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
