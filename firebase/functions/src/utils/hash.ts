import { createHash } from 'crypto';

export function hashUid(uid: string): string {
  return createHash('sha256').update(uid).digest('hex');
}
