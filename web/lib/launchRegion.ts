/** Center and radius match `placesProxy` autocomplete bias (South Jersey launch market). */
export const LAUNCH_MAP_CENTER = { lat: 39.79, lng: -74.82 } as const;

/** 40 km — same order of magnitude as Places `radius: 40000` (meters). */
export const LAUNCH_RADIUS_KM = 40;

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * (2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

export function isWithinLaunchRegion(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return distanceKm(LAUNCH_MAP_CENTER, { lat, lng }) <= LAUNCH_RADIUS_KM;
}
