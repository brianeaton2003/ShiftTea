'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { SiteFooter } from '@/components/SiteFooter';

export function MobileShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/';
  const searchParams = useSearchParams();
  const showReviewCta = !pathname.startsWith('/review');
  const [showScrollTop, setShowScrollTop] = useState(false);

  const updateScrollTopVisibility = useCallback(() => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const doc = document.documentElement;
    const maxScroll = Math.max(0, doc.scrollHeight - window.innerHeight);
    setShowScrollTop(maxScroll > 100 && scrollTop > maxScroll * 0.5);
  }, []);

  useEffect(() => {
    // Clear stale scroll locks left behind by overlays/hot reload.
    if (document.body.style.overflow === 'hidden') {
      document.body.style.overflow = '';
    }

    updateScrollTopVisibility();
    window.addEventListener('scroll', updateScrollTopVisibility, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollTopVisibility);
  }, [pathname, updateScrollTopVisibility]);

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
    <div className="flex min-h-[100dvh] w-full flex-1 flex-col bg-orange-50">
      <Navbar />

      <motion.div
        key={pathname}
        initial={{ opacity: 0.88, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex min-h-full w-full flex-col">
          <div className="grow px-4 pb-6 pt-[calc(3.5rem+env(safe-area-inset-top,0px)+0.75rem)] sm:px-6 md:px-6 md:pt-[calc(3.5rem+env(safe-area-inset-top,0px)+1rem)] lg:px-8 lg:pt-[calc(3.5rem+env(safe-area-inset-top,0px)+1.25rem)]">
            {children}
          </div>
          <SiteFooter padBottomForMobileCta={showReviewCta} />
        </div>
     </motion.div>

      {showScrollTop ? (
        <div
          className={`pointer-events-none fixed right-4 z-[45] lg:hidden ${
            showReviewCta
              ? 'bottom-[calc(6.25rem+env(safe-area-inset-bottom,0px))]'
              : 'bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))]'
          }`}
        >
          <button
            type="button"
            aria-label="Back to top"
            className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg transition-colors hover:bg-orange-600 active:bg-orange-600"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <svg width={22} height={22} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      ) : null}

      {showReviewCta && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center lg:hidden">
          <div className="pointer-events-auto w-full border-t border-gray-100 bg-white/95 px-4 pt-3 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur supports-[backdrop-filter]:bg-white/90 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6 lg:px-8">
            <Link
              prefetch={false}
              href={reviewHref}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-4 py-4 text-base font-bold text-white shadow-md transition-colors hover:bg-orange-600 active:bg-orange-600"
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
