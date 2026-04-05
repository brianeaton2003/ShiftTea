'use client';

import { getApp, getApps, initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider, getToken, type AppCheck } from 'firebase/app-check';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1');

const emulatorFlag = process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === 'true';
const isLocalHost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const useEmulators = emulatorFlag && isLocalHost;

if (useEmulators) {
  try { connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true }); } catch {}
  try { connectFirestoreEmulator(db, 'localhost', 8080); } catch {}
  try { connectFunctionsEmulator(functions, 'localhost', 5001); } catch {}
}

let appCheck: AppCheck | undefined;

if (typeof window !== 'undefined') {
  if (useEmulators) {
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (siteKey) {
    try {
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch {
      /* HMR / double init */
    }
  } else if (!useEmulators) {
    console.warn(
      '[ShiftTea] NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set. Enable App Check in Firebase Console and add the reCAPTCHA v3 site key.',
    );
  }
}

/** Attach to `placesProxy` fetches when App Check is initialized. */
export async function getAppCheckHeaders(): Promise<HeadersInit> {
  if (!appCheck) return {};
  try {
    const { token } = await getToken(appCheck, false);
    return { 'X-Firebase-AppCheck': token };
  } catch {
    return {};
  }
}