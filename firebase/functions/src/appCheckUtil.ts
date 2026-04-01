import * as admin from 'firebase-admin';

/**
 * Skip App Check verification in the Functions emulator (tokens differ) or when APPCHECK_DISABLE=true.
 * Production: always verify for HTTP handlers that opt in.
 */
export function shouldVerifyAppCheck(): boolean {
  return process.env.FUNCTIONS_EMULATOR !== 'true' && process.env.APPCHECK_DISABLE !== 'true';
}

export async function verifyAppCheckTokenOptional(token: string | undefined): Promise<void> {
  if (!shouldVerifyAppCheck()) return;
  if (!token?.trim()) {
    throw new Error('missing-app-check');
  }
  await admin.appCheck().verifyToken(token.trim());
}

export function callableAppCheckEnforced(): boolean {
  return shouldVerifyAppCheck();
}
