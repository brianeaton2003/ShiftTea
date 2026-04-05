/** Firestore doc id for a user-typed address when geocode has no `place_id`. Prefix avoids clashing with Google place ids. */

const PREFIX = 'stman_';

function normalizePart(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

async function sha256HexPrefix(input: string, hexLen: number): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex.slice(0, hexLen);
}

export async function makeManualLocationId(
  companyName: string,
  formattedAddress: string,
  lat: number,
  lng: number,
): Promise<string> {
  const payload = [
    normalizePart(companyName),
    normalizePart(formattedAddress),
    lat.toFixed(5),
    lng.toFixed(5),
  ].join('|');
  const id = await sha256HexPrefix(payload, 24);
  return `${PREFIX}${id}`;
}
