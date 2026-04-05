'use client';

import Image from 'next/image';

export function DesktopComingSoon() {
  return (
    <div className="min-h-[100dvh] bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-4xl items-center justify-center">
        <div className="w-full rounded-3xl border border-orange-100 bg-white p-10 shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-50 ring-1 ring-orange-100">
            <Image src="/logo.png" alt="ShiftTea" width={54} height={54} priority />
          </div>

          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-orange-500">
            ShiftTea
          </p>
          <h1 className="text-center text-4xl font-extrabold text-gray-900">Desktop Coming Soon</h1>
          <p className="mx-auto mt-4 max-w-xl text-center text-base leading-relaxed text-gray-600">
            ShiftTea is launching mobile-first for South Jersey workers. The full desktop experience is on the way.
            For now, open the site on your phone to browse locations, read reviews, and post anonymously.
          </p>

          <div className="mx-auto mt-8 grid max-w-xl grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-100 bg-orange-50/50 px-4 py-3 text-center">
              <p className="text-xs text-gray-500">Region</p>
              <p className="text-sm font-semibold text-gray-900">South Jersey</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-orange-50/50 px-4 py-3 text-center">
              <p className="text-xs text-gray-500">Mode</p>
              <p className="text-sm font-semibold text-gray-900">Anonymous</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-orange-50/50 px-4 py-3 text-center">
              <p className="text-xs text-gray-500">Focus</p>
              <p className="text-sm font-semibold text-gray-900">Mobile First</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

