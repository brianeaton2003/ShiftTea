import * as leoPro from 'leo-profanity';

function normalizeForProfanityCheck(text: string): { spaced: string; condensed: string } {
  const mapped = text
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/[^a-z0-9]+/g, ' ');

  const spaced = mapped.replace(/[^a-z]+/g, ' ').trim();
  const condensed = mapped.replace(/[^a-z]+/g, '');
  return { spaced, condensed };
}

export function containsProfanity(text: string): boolean {
  const input = text?.trim() ?? '';
  if (!input) return false;

  const { spaced, condensed } = normalizeForProfanityCheck(input);
  return leoPro.check(spaced) || leoPro.check(condensed);
}
