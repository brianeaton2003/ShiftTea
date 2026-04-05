import { Suspense } from 'react';
import { LocationsPageClient } from './LocationsPageClient';

function LocationsFallback() {
  return (
    <div className="px-4 py-8 text-center text-sm text-gray-500" aria-busy="true">
      Loading…
    </div>
  );
}

export default function LocationsPage() {
  return (
    <Suspense fallback={<LocationsFallback />}>
      <LocationsPageClient />
    </Suspense>
  );
}
