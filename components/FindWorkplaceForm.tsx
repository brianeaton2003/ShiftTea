'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { AddWorkplaceModal } from '@/components/AddWorkplaceModal';
import { searchLocationsByPrefix, type LocalLocationHit } from '@/lib/locations/locationSearchService';
import { getPlaceDetails, searchSouthJerseyGoogleEmployers } from '@/lib/places/placesService';
import { isWithinLaunchRegion } from '@/constants/launchRegion';
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
  const [searchError, setSearchError] = useState<string | null>(null);
  const [addWorkplaceOpen, setAddWorkplaceOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const detailsCache = useRef<Map<string, Awaited<ReturnType<typeof getPlaceDetails>>>>(new Map());

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectionError(null);
    setSearchError(null);
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
        const localPlaceIds = new Set(local.map((h) => h.locationId));

        // Single placesProxy invocation (autocomplete + parallel details + server-side NJ / launch filter).
        const googleHits = await searchSouthJerseyGoogleEmployers(query, remaining);
        const googleRows: SearchRow[] = [];
        for (const row of googleHits) {
          if (googleRows.length >= remaining) break;
          if (localPlaceIds.has(row.placeId)) continue;
          detailsCache.current.set(row.placeId, row.details);
          googleRows.push({
            kind: 'google',
            key: `g-${row.placeId}`,
            placeId: row.placeId,
            title: row.mainText,
            subtitle: row.secondaryText,
          });
        }

        setRows([...localRows, ...googleRows]);
      } catch {
        setRows([]);
        setSearchError('Search is unavailable right now. Please try again in a moment.');
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
        router.push(
          buildReviewQuery({
            locationId: hit.locationId,
            companyName: hit.companyName,
            address: hit.address,
            city: hit.city,
            zip: hit.zip,
            category: 'business',
            lat: '39.79',
            lng: '-74.97',
          }),
        );
      }
    },
    [variant, router, buildReviewQuery],
  );

  const onSelectGoogle = useCallback(
    async (placeId: string) => {
      setSelecting(true);
      setSelectionError(null);
      try {
        // Check Firestore cache first — avoids re-fetching details we already have
        const locSnap = await getDoc(doc(db, 'locations', placeId));
        if (locSnap.exists()) {
          const existing = locSnap.data();
          const companyName = String(existing?.company_name ?? '');
          router.push(buildLocationHref(placeId, companyName));
          return;
        }

        // Fall back to details cached during the search
        const details = detailsCache.current.get(placeId) ?? await getPlaceDetails(placeId);
        if (!details) return;
        if (details.state !== 'NJ') {
          setSelectionError('That workplace is outside South Jersey. Try another result.');
          return;
        }
        if (!isWithinLaunchRegion(details.lat, details.lng)) {
          setSelectionError('That workplace is outside the South Jersey area we support right now.');
          return;
        }

        // For both variants, navigate with the place details we already have.
        // The location doc is created lazily when a review is submitted.
        if (variant === 'locations') {
          router.push(buildLocationHref(placeId, details.name));
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
        <div className="mb-4 flex items-start gap-3">
          {leading ? <div className="shrink-0 pt-1 lg:hidden">{leading}</div> : null}
          <div className="flex-1 min-w-0">
            {title && <h1 className="mb-1 text-2xl font-bold text-gray-900 lg:text-3xl">{title}</h1>}
            {description && (
              <p className="text-sm italic text-gray-500 lg:text-base">{description}</p>
            )}
          </div>
        </div>
      ) : (
        <>
          {title && <h1 className="mb-1 text-2xl font-bold text-gray-900 lg:text-3xl">{title}</h1>}
          {description && (
            <p className="mb-4 text-sm italic text-gray-500 lg:text-base">{description}</p>
          )}
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
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center lg:left-4">
          <svg
            width={18}
            height={18}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="text-gray-500 lg:h-5 lg:w-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search South Jersey employers…"
          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-400 lg:h-14 lg:rounded-2xl lg:border-2 lg:border-black/10 lg:py-4 lg:pl-12 lg:text-base lg:focus:border-orange-500"
          autoComplete="off"
          autoCorrect="off"
        />
        {searching && (
          <div className="absolute inset-y-0 right-3 flex items-center">
            <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {searchError ? (
        <p className="mb-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {searchError}
        </p>
      ) : null}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm lg:rounded-2xl lg:border-black/10">
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
