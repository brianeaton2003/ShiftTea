import { apiPost } from '@/lib/api';

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
  const data = await apiPost<{ matches?: WorkplaceMatch[] }>('/api/places/match-custom', payload);
  return Array.isArray(data.matches) ? data.matches : [];
}
