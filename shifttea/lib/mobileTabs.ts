/** Main bottom-nav tabs: swipe left advances, swipe right goes back (stories order). */
export const MOBILE_TAB_ROUTES = ['/', '/locations/', '/review/select-location/', '/account/'] as const;

export type MobileTabRoute = (typeof MOBILE_TAB_ROUTES)[number];

export function getMobileTabIndex(pathname: string): number {
  if (pathname === '/') return 0;
  if (pathname.startsWith('/locations')) return 1;
  if (pathname.startsWith('/review')) return 2;
  if (pathname.startsWith('/account')) return 3;
  return 0;
}

export function getMobileTabRouteForPath(pathname: string): MobileTabRoute {
  const i = getMobileTabIndex(pathname);
  return MOBILE_TAB_ROUTES[i]!;
}
