import Link from 'next/link';
import { BrandLogoFooter } from '@/components/BrandLogo';

type SiteFooterProps = {
  /** Extra bottom inset on small screens so the fixed “Write a review” bar does not cover links. */
  padBottomForMobileCta?: boolean;
};

export function SiteFooter({ padBottomForMobileCta = false }: SiteFooterProps) {
  const bottomClass = padBottomForMobileCta
    ? 'pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-12'
    : 'pb-8 sm:pb-12 lg:pb-12';

  return (
    <footer
      className={`w-full shrink-0 border-t border-white/10 bg-slate-900 pt-8 text-slate-50 sm:pt-12 ${bottomClass}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 grid grid-cols-1 gap-10 md:grid-cols-2">
          <div>
            <div className="mb-4">
              <BrandLogoFooter />
            </div>
            <p className="max-w-sm text-sm opacity-80">Honest reviews for honest work.</p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <div>
              <h4 className="mb-3 text-sm font-semibold">For workers</h4>
              <ul className="space-y-2 text-sm opacity-80">
                <li>
                  <Link prefetch={false} href="/review/select-location/" className="transition-opacity hover:opacity-100">
                    Write a review
                  </Link>
                </li>
                <li>
                  <Link prefetch={false} href="/locations/" className="transition-opacity hover:opacity-100">
                    Browse reviews
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold">Company</h4>
              <ul className="space-y-2 text-sm opacity-80">
                <li>
                  <span className="opacity-60">About</span>
                  <span className="sr-only"> (coming soon)</span>
                </li>
                <li>
                  <Link prefetch={false} href="/terms/" className="transition-opacity hover:opacity-100">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 text-center text-sm opacity-60">
          © {new Date().getFullYear()} ShiftTea. All reviews are anonymous and submitted by verified workers.
        </div>
      </div>
    </footer>
  );
}
