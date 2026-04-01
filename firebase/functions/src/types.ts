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
