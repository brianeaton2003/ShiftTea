/** Canonical app routes (`next.config.ts` uses `trailingSlash: true`). */
export const PATH_LOCATIONS_INDEX = '/locations/';
export const PATH_REVIEW_INDEX = '/review/new/';
export const PATH_REVIEW_SELECT_LOCATION = '/review/select-location/';
export const PATH_LOGIN = '/auth/login/';
export const PATH_SIGNUP = '/auth/signup/';

export function buildLocationHref(locationId: string, companyName?: string): string {
  const sp = new URLSearchParams({ locationId });
  if (companyName?.trim()) sp.set('companyName', companyName.trim());
  return `${PATH_LOCATIONS_INDEX}?${sp.toString()}`;
}

export function buildReviewHref(params?: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) return PATH_REVIEW_SELECT_LOCATION;
  return `${PATH_REVIEW_INDEX}?${new URLSearchParams(params).toString()}`;
}
