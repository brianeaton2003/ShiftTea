import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import 'server-only';

function getOrInitApp(): App {
  const apps = getApps();
  if (apps.length > 0) return apps[0]!;

  const useEmu = process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === 'true';
  if (useEmu) {
    process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();

  if (keyJson) {
    const cred = JSON.parse(keyJson) as Parameters<typeof cert>[0];
    return initializeApp({ credential: cert(cred), projectId: projectId ?? undefined });
  }

  if (useEmu && projectId) {
    return initializeApp({ projectId });
  }

  throw new Error(
    'Server Firestore: set FIREBASE_SERVICE_ACCOUNT_KEY (JSON string) or enable emulators with NEXT_PUBLIC_FIREBASE_USE_EMULATORS=true and NEXT_PUBLIC_FIREBASE_PROJECT_ID.',
  );
}

export function getAdminFirestore() {
  getOrInitApp();
  return getFirestore();
}
