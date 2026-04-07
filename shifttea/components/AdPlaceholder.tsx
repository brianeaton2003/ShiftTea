'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

type AdSlot = 'feed' | 'in-review';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim() ?? '';
const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production';
const TEST_MODE = process.env.NEXT_PUBLIC_ADSENSE_TEST_MODE === 'true' || IS_DEVELOPMENT;

const SLOT_CONFIG: Record<AdSlot, { height: string; label: string; slotId: string | undefined }> = {
  feed: {
    height: 'min-h-[90px]',
    label: 'AdSense · 320×90',
    slotId: process.env.NEXT_PUBLIC_ADSENSE_SLOT_FEED,
  },
  'in-review': {
    height: 'min-h-[56px]',
    label: 'AdSense · 320×50',
    slotId: process.env.NEXT_PUBLIC_ADSENSE_SLOT_IN_REVIEW,
  },
};

export function AdPlaceholder({ slot }: { slot: AdSlot }) {
  const { height, label, slotId } = SLOT_CONFIG[slot];
  const [isScriptReady, setIsScriptReady] = useState(
    () => typeof window !== 'undefined' && Boolean(window.adsbygoogle),
  );
  const [scriptFailed, setScriptFailed] = useState(false);
  const hasPushedAd = useRef(false);
  const canRenderRealAd = Boolean(ADSENSE_CLIENT && slotId);
  const debugStatus = !canRenderRealAd
    ? 'fallback: missing env'
    : scriptFailed
      ? 'adsense script failed'
      : isScriptReady
        ? 'ad request sent'
        : 'loading adsense script';

  useEffect(() => {
    if (!canRenderRealAd || !isScriptReady || hasPushedAd.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      hasPushedAd.current = true;
    } catch {
      // Keep the fallback frame if push fails in local/dev.
    }
  }, [canRenderRealAd, isScriptReady]);

  if (!canRenderRealAd) {
    return (
      <div
        className={`w-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 ${height}`}
      >
        {IS_DEVELOPMENT && (
          <span className="mb-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
            {debugStatus}
          </span>
        )}
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-300">
          Advertisement
        </span>
        <span className="mt-0.5 text-[9px] text-gray-200">{label}</span>
      </div>
    );
  }

  return (
    <div className={`w-full rounded-xl border border-gray-100 bg-white p-2 shadow-sm ${height}`}>
      <Script
        id="adsense-script"
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
        crossOrigin="anonymous"
        strategy="afterInteractive"
        onLoad={() => setIsScriptReady(true)}
        onError={() => setScriptFailed(true)}
      />
      {IS_DEVELOPMENT && (
        <div className="mb-2 rounded bg-sky-50 px-2 py-1 text-[10px] font-medium text-sky-700">
          {debugStatus}
          {TEST_MODE ? ' (adtest=on)' : ''}
        </div>
      )}
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
        data-adtest={TEST_MODE ? 'on' : undefined}
      />
    </div>
  );
}
