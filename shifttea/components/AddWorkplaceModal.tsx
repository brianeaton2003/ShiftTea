'use client';

import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '@/lib/firebase/firebase';
import { LAUNCH_MAP_CENTER } from '@/constants/launchRegion';
import { makeManualLocationId } from '@/lib/locations/manualLocationId';
import { containsProfanity } from '@/utils/profanity';
import { buildLocationHref, buildReviewHref } from '@/lib/routes';
import { matchCustomWorkplace, type WorkplaceMatch } from '@/lib/locations/workplaceMatchService';

const MAX_NAME_LEN = 120;
const ZIP_RE = /^\d{5}$/;
const SOUTH_JERSEY_ZIP_PREFIXES = ['08'];


export type AddWorkplaceFlow = 'locationDetail' | 'review';

interface Props {
  open: boolean;
  onClose: () => void;
  flow: AddWorkplaceFlow;
}


export function AddWorkplaceModal({ open, onClose, flow }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'pick'>('form');
  const [companyName, setCompanyName] = useState('');
  const [manualStreet, setManualStreet] = useState('');
  const [manualCity, setManualCity] = useState('');
  const [manualZip, setManualZip] = useState('');
  const [candidates, setCandidates] = useState<WorkplaceMatch[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const normName = companyName.trim().replace(/\s+/g, ' ').toLowerCase();
  const normStreet = manualStreet.trim().replace(/\s+/g, ' ').toLowerCase();
  const normCity = manualCity.trim().replace(/\s+/g, ' ').toLowerCase();
  const zipDigits = manualZip.replace(/\D/g, '').slice(0, 5);

  const nameValid = normName.length > 0 && normName.length <= MAX_NAME_LEN;
  const streetValid = normStreet.length > 0;
  const cityValid = normCity.length > 0 && !/\d/.test(manualCity);
  const zipValid =
    ZIP_RE.test(zipDigits) && SOUTH_JERSEY_ZIP_PREFIXES.some((p) => zipDigits.startsWith(p));

  const nameIsVulgar = containsProfanity(companyName);
  const streetIsVulgar = containsProfanity(manualStreet);

  const requiredFilled = nameValid && streetValid && cityValid && zipValid;
  const canContinue = requiredFilled && !submitting && !nameIsVulgar && !streetIsVulgar;

  useEffect(() => {
    if (!open) return;
    setCompanyName('');
    setManualStreet('');
    setManualCity('');
    setManualZip('');
    setStep('form');
    setCandidates([]);
    setError(null);
    const t = requestAnimationFrame(() => nameInputRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const proceedManualCreate = useCallback(async () => {
    const name = companyName.trim();
    const street = manualStreet.trim();
    const city = manualCity.trim();
    const zip = zipDigits.trim();
    const address = `${street}, ${city}, NJ ${zip}`;
    const locationId = await makeManualLocationId(name, address, LAUNCH_MAP_CENTER.lat, LAUNCH_MAP_CENTER.lng);
    const locSnap = await getDoc(doc(db, 'locations', locationId));
    if (locSnap.exists()) {
      const resolvedName = String(locSnap.data()?.company_name ?? name);
      if (flow === 'locationDetail') {
        router.push(buildLocationHref(locationId, resolvedName));
      } else {
        router.push(buildReviewHref({ locationId }));
      }
      onClose();
      return;
    }

    if (flow === 'locationDetail') {
      router.push(buildLocationHref(locationId, name.slice(0, MAX_NAME_LEN)));
      onClose();
      return;
    }

    const params = {
      locationId,
      companyName: name.slice(0, MAX_NAME_LEN),
      address,
      city,
      zip,
      category: 'custom workplace',
      lat: String(LAUNCH_MAP_CENTER.lat),
      lng: String(LAUNCH_MAP_CENTER.lng),
    };
    router.push(buildReviewHref(params));
    onClose();
  }, [companyName, manualStreet, manualCity, zipDigits, flow, router, onClose]);

  const onSelectCandidate = useCallback(
    async (m: WorkplaceMatch) => {
      setSubmitting(true);
      setError(null);
      try {
        if (m.source === 'database') {
          if (flow === 'locationDetail') {
            router.push(buildLocationHref(m.location_id, m.company_name));
          } else {
            router.push(buildReviewHref({ locationId: m.location_id }));
          }
          onClose();
          return;
        }

        // Location is created lazily on review submit — just navigate with the details we have
        if (flow === 'locationDetail') {
          router.push(buildLocationHref(m.place_id, m.company_name));
          onClose();
          return;
        }

        const formattedLine = `${m.address}, ${m.city}, NJ ${m.zip}`;
        router.push(
          buildReviewHref({
            locationId: m.place_id,
            companyName: m.company_name,
            address: formattedLine,
            city: m.city,
            zip: m.zip,
            category: 'business',
            lat: String(m.lat),
            lng: String(m.lng),
          }),
        );
        onClose();
      } catch (e) {
        console.error(e);
        setError('Something went wrong. Try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [flow, router, onClose],
  );

  const onContinue = useCallback(async () => {
    setError(null);

    const name = companyName.trim();
    const street = manualStreet.trim();
    const city = manualCity.trim();
    const zip = zipDigits.trim();

    if (!name || !nameValid) {
      setError('Enter the workplace name.');
      return;
    }
    if (!streetValid || !city) {
      setError('Enter street address and city.');
      return;
    }
    if (!zipValid) {
      setError('Use a valid ZIP code (e.g. 08096).');
      return;
    }
    if (nameIsVulgar) {
      setError('Workplace name contains inappropriate language. Please change it.');
      return;
    }
    if (streetIsVulgar) {
      setError('Street address contains inappropriate language. Please change it.');
      return;
    }

    setSubmitting(true);
    try {
      const matches = await matchCustomWorkplace({
        company_name: name.slice(0, MAX_NAME_LEN),
        street,
        city,
        zip,
      });
      if (matches.length > 0) {
        setCandidates(matches);
        setStep('pick');
        return;
      }
      await proceedManualCreate();
    } catch (e: unknown) {
      console.error(e);
      const msg = (e instanceof Error ? e.message : '').toLowerCase();
      if (msg.includes('invalid-zip') || msg.includes('zip')) {
        setError('Use a valid ZIP code (e.g. 08096 — South Jersey only).');
      } else if (msg.includes('profanity')) {
        setError('Please remove inappropriate language and try again.');
      } else {
        setError('Something went wrong. Check your connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    companyName,
    manualStreet,
    manualCity,
    zipDigits,
    nameValid,
    streetValid,
    zipValid,
    nameIsVulgar,
    streetIsVulgar,
    proceedManualCreate,
  ]);

  const onAddMyOwnAnyway = useCallback(async () => {
    setError(null);
    setSubmitting(true);
    try {
      await proceedManualCreate();
    } catch (e) {
      console.error(e);
      setError('Something went wrong. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }, [proceedManualCreate]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-workplace-title"
        className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-xl max-h-[min(92dvh,640px)] flex flex-col"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 shrink-0">
          <h2 id="add-workplace-title" className="text-lg font-bold text-gray-900">
            {step === 'form' ? 'Add a workplace' : 'Is this your workplace?'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <svg width={22} height={22} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === 'pick' ? (
          <>
            <div className="px-4 py-4 space-y-3 overflow-y-auto min-h-0">
              <p className="text-sm text-gray-600">
                We found {candidates.length === 1 ? 'a possible match' : 'possible matches'} from ShiftTea or Google. Select one
                or add your workplace manually.
              </p>
              <div className="space-y-2">
                {candidates.map((m, idx) => (
                  <button
                    key={m.source === 'database' ? m.location_id : `${m.place_id}-${idx}`}
                    type="button"
                    disabled={submitting}
                    onClick={() => void onSelectCandidate(m)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-left hover:bg-orange-50 transition-colors disabled:opacity-50"
                  >
                    <p className="text-sm font-semibold text-gray-900">{m.company_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {[m.address, m.city, m.zip].filter(Boolean).join(' · ')}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-600 mt-1">
                      {m.source === 'database' ? 'On ShiftTea' : 'Google Maps'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-gray-100 px-4 py-3 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2">
              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
              <button
                type="button"
                disabled={submitting}
                onClick={() => void onAddMyOwnAnyway()}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-60"
              >
                None of these — add my workplace
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setStep('form');
                  setCandidates([]);
                  setError(null);
                }}
                className="w-full rounded-xl py-2 text-sm font-semibold text-gray-500 hover:text-gray-700"
              >
                Back to form
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="px-4 py-4 space-y-4 overflow-y-auto min-h-0">
              <p className="text-sm text-gray-600">
                Can&apos;t find your workplace? Create one manually here. We&apos;ll check for duplicates when you continue.
              </p>

              <div>
                <label htmlFor="add-workplace-name" className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                  Workplace name <span className="text-red-500">*</span>
                </label>
                <input
                  id="add-workplace-name"
                  ref={nameInputRef}
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value.slice(0, MAX_NAME_LEN))}
                  placeholder="enter company name..."
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  autoComplete="organization"
                />
                {nameIsVulgar && (
                  <p className="text-xs text-red-600 mt-1">Please remove inappropriate language from the workplace name.</p>
                )}
                {!nameIsVulgar && !nameValid && companyName.trim().length > 0 && (
                  <p className="text-xs text-red-600 mt-1">Workplace name must be 1-120 characters.</p>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label htmlFor="manual-street" className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                    Street address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="manual-street"
                    type="text"
                    value={manualStreet}
                    onChange={(e) => setManualStreet(e.target.value)}
                    placeholder="enter street address..."
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    autoComplete="street-address"
                  />
                  {streetIsVulgar ? (
                    <p className="text-xs text-red-600 mt-1">
                      Please remove inappropriate language from the street address.
                    </p>
                  ) : !streetValid && manualStreet.trim().length > 0 ? (
                    <p className="text-xs text-red-600 mt-1">Street address is required.</p>
                  ) : null}
                </div>
                <div>
                  <label htmlFor="manual-city" className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="manual-city"
                    type="text"
                    value={manualCity}
                    onChange={(e) => setManualCity(e.target.value)}
                    placeholder="enter city..."
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    autoComplete="address-level2"
                  />
                  {!cityValid && manualCity.trim().length > 0 && (
                    <p className="text-xs text-red-600 mt-1">City must not contain numbers.</p>
                  )}
                </div>
                <div>
                  <label htmlFor="manual-zip" className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                    ZIP code <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="manual-zip"
                    type="text"
                    inputMode="numeric"
                    value={manualZip}
                    onChange={(e) => setManualZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    placeholder="enter ZIP code..."
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    autoComplete="postal-code"
                  />
                  {!zipValid && manualZip.trim().length > 0 && (
                    <p className="text-xs text-red-600 mt-1">ZIP must be 5 digits and start with 08.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 px-4 py-3 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-3">
              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
              <button
                type="button"
                disabled={!canContinue}
                onClick={() => void onContinue()}
                className="w-full rounded-2xl bg-orange-500 px-4 py-3.5 text-base font-bold text-white shadow-md disabled:opacity-60 hover:bg-orange-600 active:bg-orange-600"
              >
                {submitting ? 'Working…' : 'Continue'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
