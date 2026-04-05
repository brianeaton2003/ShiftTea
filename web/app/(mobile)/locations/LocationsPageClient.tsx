'use client';

import { FindWorkplaceForm } from '@/components/FindWorkplaceForm';
import { LocationDetailView } from '@/components/LocationDetailView';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export function LocationsPageClient() {
  const searchParams = useSearchParams();
  const locationId = searchParams.get('locationId')?.trim() ?? '';

  if (locationId) {
    return <LocationDetailView id={locationId} />;
  }

  return (
    <div>
      <FindWorkplaceForm
        variant="locations"
        title="Find a workplace"
        description="Searches powered by Google"
        leading={
          <Link
            prefetch={false}
            href="/"
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Back to home"
          >
            <svg width={20} height={20} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        }
      />
    </div>
  );
}
