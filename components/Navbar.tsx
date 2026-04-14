'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/firebase/authStore';
import { BrandLogo } from '@/components/BrandLogo';
import { MobileNavMenu } from '@/components/MobileNavMenu';

export function Navbar() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  const accountLabel = loading ? 'Account' : user ? 'Account' : 'Sign in';

  return (
    <header className="fixed left-0 right-0 top-0 z-[60] shrink-0 border-b border-black/10 bg-white/80 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 md:px-6 lg:px-8">
        <BrandLogo />

        <div className="hidden items-center gap-8 lg:flex">
          <Link prefetch={false} href="/" className="text-sm text-gray-700 transition-opacity hover:opacity-70">
            Home
          </Link>
          <Link
            prefetch={false}
            href="/review/select-location/"
            className="text-sm text-gray-700 transition-opacity hover:opacity-70"
          >
            Write a review
          </Link>
          <Link prefetch={false} href="/locations/" className="text-sm text-gray-700 transition-opacity hover:opacity-70">
            Find employers
          </Link>
        </div>

        <div className="flex items-center gap-1 lg:gap-2">
          <Link
            prefetch={false}
            href="/account"
            className="hidden items-center gap-2 rounded-full border-2 border-orange-500 px-4 py-2 text-sm font-semibold text-orange-500 transition-colors hover:bg-orange-500 hover:text-white lg:inline-flex"
          >
            <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span>{accountLabel}</span>
          </Link>

          <MobileNavMenu accountLabel={accountLabel} />
        </div>
      </nav>
    </header>
  );
}
