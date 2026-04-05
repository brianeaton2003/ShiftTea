'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { AddWorkplaceModal } from '@/components/AddWorkplaceModal';
import { searchLocationsByPrefix, type LocalLocationHit } from '@/lib/locationSearchService';
import { autocomplete, getPlaceDetails } from '@/lib/placesService';
import { isWithinLaunchRegion } from '@/lib/launchRegion';
import { buildLocationHref, buildReviewHref } from '@/lib/routes';

type SearchRow =
  | { kind: 'local'; key: string; hit: LocalLocationHit }
  | { kind: 'google'; key: string; placeId: string; title: string; subtitle: string };

export type FindWorkplaceVariant = 'locations' | 'review';

interface Props {
  variant: FindWorkplaceVariant;
  title?: string;
  description?: string;
  leading?: React.ReactNode;
}

export function FindWorkplaceForm({ variant, title, description, leading }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<SearchRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [addWorkplaceOpen, setAddWorkplaceOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const detailsCache = useRef<Map<string, Awaited<ReturnType<typeof getPlaceDetails>>>>(new Map());

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectionError(null);
    if (timer.current) clearTimeout(timer.current);
    if (query.trim().length < 2) {
      setRows([]);
      return;
    }

    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const BATCH = 10;

        // ShiftTea matches first; only call Google to fill the remainder.
        const local = await searchLocationsByPrefix(query, BATCH);
        const localRows: SearchRow[] = local.map((hit) => ({
          kind: 'local',
          key: `l-${hit.locationId}`,
          hit,
        }));

        if (localRows.length >= BATCH) {
          setRows(localRows);
          return;
        }

        const remaining = BATCH - localRows.length;
        const predictions = await autocomplete(query);
        // Doc ids for Google-sourced locations are the same as `place_id`; skip Google rows we already have locally.
        const localPlaceIds = new Set(local.map((h) => h.locationId));

        // Make the dropdown South-Jersey-exclusive by validating each Google suggestion.
        // (Autocomplete can return "Philadelphia, PA" even when the establishment is in NJ.)
        const googleRows: SearchRow[] = [];
        for (const p of predictions) {
          if (googleRows.length >= remaining) break;
          if (localPlaceIds.has(p.placeId)) continue;
          try {
            const fromCache = detailsCache.current.get(p.placeId);
            const details = fromCache ?? (await getPlaceDetails(p.placeId));
            detailsCache.current.set(p.placeId, details);
            if (!details) continue;
            if (details.state !== 'NJ') continue;
            if (!isWithinLaunchRegion(details.lat, details.lng)) continue;

            googleRows.push({
              kind: 'google',
              key: `g-${p.placeId}`,
              placeId: p.placeId,
              title: p.mainText,
              subtitle: p.secondaryText,
            });
          } catch {
            // If Google details fails for one candidate, skip it and keep going.
          }
        }

        setRows([...localRows, ...googleRows]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  const buildReviewQuery = useCallback((params: Record<string, string>) => buildReviewHref(params), []);

  const onSelectLocal = useCallback(
    (hit: LocalLocationHit) => {
      if (variant === 'locations') {
        router.push(buildLocationHref(hit.locationId, hit.companyName));
      } else {
        router.push(buildReviewQuery({ locationId: hit.locationId }));
      }
    },
    [variant, router, buildReviewQuery],
  );

  const onSelectGoogle = useCallback(
    async (placeId: string) => {
      setSelecting(true);
      setSelectionError(null);
      try {
        const locSnap = await getDoc(doc(db, 'locations', placeId));
        if (locSnap.exists()) {
          const existing = locSnap.data();
          const companyName = String(existing?.company_name ?? '');
          router.push(buildLocationHref(placeId, companyName));
          return;
        }
        const details = await getPlaceDetails(placeId);
        if (!details) return;
        if (details.state !== 'NJ') {
          setSelectionError('That workplace is outside South Jersey. Try another result.');
          return;
        }
        if (!isWithinLaunchRegion(details.lat, details.lng)) {
          setSelectionError('That workplace is outside the South Jersey area we support right now.');
          return;
        }
        if (variant === 'locations') {
          const ensure = httpsCallable(functions, 'ensureLocationFromPlace');
          const ensured = await ensure({ place_id: placeId });
          const data = (ensured.data ?? {}) as { company_name?: string };
          const companyName = data.company_name ?? details.name;
          router.push(buildLocationHref(placeId, companyName));
          return;
        }
        const params = {
          locationId: placeId,
          companyName: details.name,
          address: details.address,
          city: details.city,
          zip: details.zip,
          category: details.category,
          lat: String(details.lat),
          lng: String(details.lng),
        };
        router.push(buildReviewQuery(params));
      } finally {
        setSelecting(false);
      }
    },
    [router, buildReviewQuery, variant],
  );

  return (
    <div>
      {variant === 'locations' ? (
        <div className="flex items-start gap-3 mb-4">
          {leading ? <div className="shrink-0 pt-1">{leading}</div> : null}
          <div className="flex-1 min-w-0">
            {title && <h1 className="text-2xl font-bold text-gray-900 mb-1">{title}</h1>}
            {description && <p className="text-sm text-gray-400 italic">{description}</p>}
          </div>
        </div>
      ) : (
        <>
          {title && <h1 className="text-2xl font-bold text-gray-900 mb-1">{title}</h1>}
          {description && <p className="text-sm text-gray-400 mb-4 italic">{description}</p>}
        </>
      )}

      {variant === 'review' && (
        <AddWorkplaceModal
          open={addWorkplaceOpen}
          onClose={() => setAddWorkplaceOpen(false)}
          flow="review"
        />
      )}

      <div className="relative mb-2">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search South Jersey employers…"
          className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent shadow-sm"
          autoComplete="off"
          autoCorrect="off"
        />
        {searching && (
          <div className="absolute inset-y-0 right-3 flex items-center">
            <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {selectionError && (
            <p className="px-4 py-2 text-sm text-red-600 border-b border-gray-100 bg-white">
              {selectionError}
            </p>
          )}
          {rows.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => (item.kind === 'local' ? onSelectLocal(item.hit) : onSelectGoogle(item.placeId))}
              disabled={selecting}
              className="w-full text-left px-4 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {item.kind === 'local' ? item.hit.companyName : item.title}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {item.kind === 'local' ? [item.hit.address, item.hit.city].filter(Boolean).join(' · ') : item.subtitle}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {query.length >= 2 && !searching && rows.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-8">No matches. Try another name.</p>
      )}

      {variant === 'review' && query.trim().length >= 2 && !searching && (
        <div className="mt-4 text-center px-1">
          <button
            type="button"
            onClick={() => setAddWorkplaceOpen(true)}
            className="text-sm font-semibold text-orange-600 hover:text-orange-700 underline underline-offset-2"
          >
            Can&apos;t find it? Add your workplace
          </button>
        </div>
      )}
    </div>
  );
}
