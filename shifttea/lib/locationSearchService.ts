import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { getSafeLocationSearchLimit, isSouthJerseyZip, normalizeSearchPrefix } from './locationSearchHelpers';

export interface LocalLocationHit {
  locationId: string;
  companyName: string;
  address: string;
  city: string;
  zip: string;
}

export function mapSearchLocationDocs(
  docs: Array<{ id: string; data: () => Record<string, unknown> }>,
): LocalLocationHit[] {
  return docs.flatMap((d) => {
    const x = d.data();
    const zip = String(x.zip ?? '');
    // South Jersey launch area: only locations with ZIPs starting "08".
    if (!isSouthJerseyZip(zip)) return [];
    return [
      {
        locationId: d.id,
        companyName: String(x.company_name ?? ''),
        address: String(x.address ?? ''),
        city: String(x.city ?? ''),
        zip,
      },
    ];
  });
}

export async function searchLocationsByPrefix(raw: string, limitCount = 25): Promise<LocalLocationHit[]> {
  const normalized = normalizeSearchPrefix(raw);
  if (normalized.length < 2) return [];
  const safeLimit = getSafeLocationSearchLimit(limitCount);
  const end = normalized + '\uf8ff';
  const q = query(
    collection(db, 'locations'),
    where('company_name_lower', '>=', normalized),
    where('company_name_lower', '<', end),
    orderBy('company_name_lower'),
    limit(safeLimit),
  );
  const snap = await getDocs(q);
  return mapSearchLocationDocs(snap.docs);
}
