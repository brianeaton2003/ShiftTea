'use client';

import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="relative z-[60] shrink-0 bg-white pt-[env(safe-area-inset-top,0px)] shadow-sm border-b border-gray-100">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-1">
          <Link
            prefetch={false}
            href="/"
            className="shrink-0 rounded-lg p-1.5 text-orange-500 transition-colors hover:bg-orange-50 hover:text-orange-600"
            aria-label="Home"
          >
            <svg width={22} height={22} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </Link>
          <Link
            prefetch={false}
            href="/"
            className="min-w-0 truncate text-xl font-bold tracking-tight"
            aria-label="ShiftTea home"
          >
            <span className="text-gray-900">Shift</span>
            <span className="text-orange-500">Tea</span>
          </Link>
        </div>
        <Link
          prefetch={false}
          href="/account"
          className="p-2 text-gray-600 transition-colors hover:text-gray-900"
          aria-label="Account"
        >
          <svg width={22} height={22} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </Link>
      </div>
    </nav>
  );
}
