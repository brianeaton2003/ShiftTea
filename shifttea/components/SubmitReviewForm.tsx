'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { StarRating } from '@/components/StarRating';
import { isAlreadyReviewedError, submitReview } from '@/lib/review/reviewService';
import type { SubmitReviewPayload } from '@/types';
import { PATH_REVIEW_SELECT_LOCATION } from '@/lib/routes';

const RATINGS = [
  { key: 'overall', label: 'Overall *' },
  { key: 'management', label: 'Management *' },
  { key: 'pay', label: 'Pay & benefits *' },
  { key: 'worklife', label: 'Work-life balance *' },
  { key: 'breaks', label: 'Break policy *' },
  { key: 'recommend', label: 'Would recommend *' },
] as const;

type RatingKey = (typeof RATINGS)[number]['key'];

export interface SubmitReviewFormProps {
  locationId: string;
  companyName: string;
  address: string;
  city: string;
  zip: string;
  category: string;
  lat: number;
  lng: number;
}

export function SubmitReviewForm({
  locationId,
  companyName,
  address,
  city,
  zip,
  category,
  lat,
  lng,
}: SubmitReviewFormProps) {
  const router = useRouter();
  const [ratings, setRatings] = useState<Record<RatingKey, number>>({
    overall: 0,
    management: 0,
    pay: 0,
    worklife: 0,
    breaks: 0,
    recommend: 0,
  });
  const [payRate, setPayRate] = useState('');
  const [tenure, setTenure] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const ratingsReady = Object.values(ratings).every((v) => v > 0);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!ratingsReady) return;

    const payload: SubmitReviewPayload = {
      location_id: locationId,
      company_name: companyName,
      address,
      city,
      zip,
      category,
      geo_point: { lat, lng },
      rating_overall: ratings.overall,
      rating_management: ratings.management,
      rating_pay: ratings.pay,
      rating_worklife: ratings.worklife,
      rating_breaks: ratings.breaks,
      rating_recommend: ratings.recommend,
    };

    const pr = payRate.trim();
    if (pr) {
      const n = parseFloat(pr);
      if (!Number.isFinite(n) || n <= 0) {
        setError('Pay rate must be a positive number.');
        return;
      }
      payload.pay_rate = n;
    }

    const tm = tenure.trim();
    if (tm) {
      const n = parseInt(tm, 10);
      if (!Number.isFinite(n) || n <= 0) {
        setError('Tenure must be a positive whole number of months.');
        return;
      }
      payload.tenure_months = n;
    }

    if (body.trim()) payload.body = body.trim();

    setSubmitting(true);
    try {
      await submitReview(payload);
      router.push(`/review/thank-you/?locationId=${encodeURIComponent(locationId)}&companyName=${encodeURIComponent(companyName)}`);
    } catch (e) {
      if (isAlreadyReviewedError(e)) {
        setError('You already reviewed this location.');
      } else {
        setError(e instanceof Error ? e.message : 'Could not submit. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <button
        type="button"
        onClick={() => router.push(PATH_REVIEW_SELECT_LOCATION)}
        className="flex items-center gap-1 text-gray-400 text-sm mb-4 hover:text-gray-600 transition-colors"
      >
        <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <h1 className="text-xl font-bold text-gray-900">{companyName}</h1>
      {address && <p className="text-sm text-gray-400 mt-1 mb-4">{address}</p>}

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-4 space-y-4">
        {RATINGS.map(({ key, label }) => (
          <div key={key}>
            <p className="text-sm text-gray-500 mb-2">{label}</p>
            <StarRating
              value={ratings[key]}
              onChange={(v) => setRatings((prev) => ({ ...prev, [key]: v }))}
              size={28}
            />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-4 space-y-4">
        <div>
          <label className="text-sm text-gray-500 block mb-1.5">Hourly pay (optional)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={payRate}
            onChange={(e) => setPayRate(e.target.value)}
            placeholder="e.g. 15.50"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div>
          <label className="text-sm text-gray-500 block mb-1.5">Tenure in months (optional)</label>
          <input
            type="number"
            min="1"
            step="1"
            value={tenure}
            onChange={(e) => setTenure(e.target.value)}
            placeholder="e.g. 6"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div>
          <label className="text-sm text-gray-500 block mb-1.5">Written review (optional, max 500 chars)</label>
          <p className="mb-2 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-xs text-orange-700">
            Keep it anonymous: do not include names, personal details, phone numbers, emails, or social handles.
          </p>
          <p className="mb-2 text-xs text-gray-500">
            <Link prefetch={false} href="/terms" className="text-orange-600 hover:text-orange-700 underline underline-offset-2">
              See our Terms of Service
            </Link>
          </p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Share your experience…"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          />
          <p className="text-xs text-gray-400 text-right mt-1">{body.length}/500</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

      <button
        type="submit"
        disabled={!ratingsReady || submitting}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-40 text-sm"
      >
        {submitting ? 'Submitting…' : 'Submit review'}
      </button>
    </form>
  );
}
