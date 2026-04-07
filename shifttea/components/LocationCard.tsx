import Link from 'next/link';
import type { LocationDoc } from '@/types';
import { avgLabel } from '@/utils/formatters';
import { buildLocationHref } from '@/lib/routes';

interface Props {
  location: LocationDoc;
}

export function LocationCard({ location }: Props) {
  const payMin = location.min_pay;
  const payMax = location.max_pay;
  const payLabel = payMin && payMax
    ? `$${payMin}-${payMax}/hr`
    : payMin
    ? `$${payMin}/hr`
    : null;

  return (
    <Link prefetch={false} href={buildLocationHref(location.location_id, location.company_name)} className="block">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-base truncate">{location.company_name}</h3>
            <p className="text-sm text-orange-500 mt-0.5">{location.city}, NJ</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs bg-orange-50 text-orange-600 border border-orange-100 rounded-full px-2.5 py-0.5 font-medium capitalize">
                {location.category}
              </span>
              {payLabel && (
              <span className="text-sm text-green-700 font-medium">{payLabel}</span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 justify-end">
              {[1,2,3,4,5].map((s) => (
                <svg key={s} width={14} height={14} viewBox="0 0 20 20"
                  fill={s <= Math.round(location.avg_rating) ? '#f59e0b' : '#d1d5db'}>
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="text-sm font-bold text-gray-800 ml-1">{avgLabel(location.avg_rating)}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{location.review_count} reviews</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
