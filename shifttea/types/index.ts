import type { Timestamp } from 'firebase/firestore';

export interface LocationDoc {
  location_id: string;
  company_name: string;
  company_name_lower?: string;
  address: string;
  city: string;
  zip: string;
  category: string;
  avg_rating: number;
  avg_management?: number;
  avg_pay?: number;
  avg_worklife?: number;
  avg_breaks?: number;
  avg_recommend?: number;
  review_count: number;
  created_by?: string;
  geo_point?: { latitude: number; longitude: number };
  min_pay?: number;
  max_pay?: number;
}

export interface ReviewDoc {
  review_id: string;
  uid_hash: string;
  created_at: Timestamp | null;
  rating_overall: number;
  rating_management: number;
  rating_pay: number;
  rating_worklife: number;
  rating_breaks: number;
  rating_recommend: number;
  pay_rate?: number;
  tenure_months?: number;
  body?: string;
  company_name: string;
  city: string;
  location_id: string;
  nsfw?: boolean;
  helpful_count?: number;
}

export interface SubmitReviewPayload {
  location_id: string;
  company_name: string;
  address: string;
  city: string;
  zip: string;
  category: string;
  geo_point: { lat: number; lng: number };
  rating_overall: number;
  rating_management: number;
  rating_pay: number;
  rating_worklife: number;
  rating_breaks: number;
  rating_recommend: number;
  pay_rate?: number;
  tenure_months?: number;
  body?: string;
}

export interface AppStatsDoc {
  total_reviews?: number;
  total_locations?: number;
}
