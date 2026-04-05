import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

export type WorkplaceMatch =
  | {
      source: 'database';
      location_id: string;
      company_name: string;
      address: string;
      city: string;
      zip: string;
    }
  | {
      source: 'google';
      place_id: string;
      company_name: string;
      address: string;
      city: string;
      zip: string;
      lat: number;
      lng: number;
    };

export async function matchCustomWorkplace(payload: {
  company_name: string;
  street: string;
  city: string;
  zip: string;
}): Promise<WorkplaceMatch[]> {
  const fn = httpsCallable(functions, 'matchCustomWorkplace');
  const res = await fn(payload);
  const data = res.data as { matches?: WorkplaceMatch[] };
  return Array.isArray(data.matches) ? data.matches : [];
}
