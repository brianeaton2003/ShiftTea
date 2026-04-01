/** Shared normalization for custom-workplace dedupe (client + server). */

export function normalizePart(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function addressFirstLine(fullAddress: string): string {
  const first = fullAddress.split(',')[0]?.trim();
  return first ?? fullAddress.trim();
}

export function normalizedZip5(digits: string): string {
  return digits.replace(/\D/g, '').slice(0, 5);
}

export interface DedupeParts {
  normName: string;
  normStreet: string;
  normCity: string;
  zip5: string;
}

export function parseDedupeParts(
  companyName: string,
  street: string,
  city: string,
  zipRaw: string,
): DedupeParts | null {
  const normName = normalizePart(companyName);
  const normStreet = normalizePart(street);
  const normCity = normalizePart(city);
  const zip5 = normalizedZip5(zipRaw);
  if (!normName || !normStreet || !normCity || zip5.length !== 5) return null;
  return { normName, normStreet, normCity, zip5 };
}

export function rowMatchesDedupe(
  row: {
    company_name_lower?: string;
    address?: string;
    city?: string;
    zip?: string;
  },
  parts: DedupeParts,
): boolean {
  const nameOk = normalizePart(String(row.company_name_lower ?? '')) === parts.normName;
  const cityOk = normalizePart(String(row.city ?? '')) === parts.normCity;
  const zipStr = normalizedZip5(String(row.zip ?? ''));
  const zipOk = zipStr === parts.zip5;
  const streetLine = normalizePart(addressFirstLine(String(row.address ?? '')));
  const streetOk = streetLine === parts.normStreet;
  return nameOk && streetOk && cityOk && zipOk;
}
