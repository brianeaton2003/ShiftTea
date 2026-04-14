'use client';

import { getAuth } from 'firebase/auth';

function getBackendUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined') {
    // Use the same host device on LAN (phone -> dev machine) when env var is unset.
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  return 'http://localhost:3000';
}

async function getIdToken(forceRefresh = false): Promise<string | null> {
  const user = getAuth().currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}

/** Unauthenticated GET to the backend. */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${getBackendUrl()}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error ?? `api-error-${res.status}`), { status: res.status });
  }
  return res.json() as Promise<T>;
}

/** Authenticated POST to the backend. Throws if not signed in. */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = await getIdToken();
  if (!token) throw new Error('unauthenticated');

  const doFetch = (idToken: string) =>
    fetch(`${getBackendUrl()}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(body),
    });

  let res = await doFetch(token);
  if (res.status === 401) {
    const fresh = await getIdToken(true);
    if (fresh) res = await doFetch(fresh);
  }

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw Object.assign(new Error(json.error ?? `api-error-${res.status}`), { status: res.status });
  }
  return res.json() as Promise<T>;
}

/** Authenticated GET to the backend. Throws if not signed in. */
export async function apiAuthGet<T>(path: string): Promise<T> {
  const token = await getIdToken();
  if (!token) throw new Error('unauthenticated');

  const doFetch = (idToken: string) =>
    fetch(`${getBackendUrl()}${path}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });

  let res = await doFetch(token);
  if (res.status === 401) {
    const fresh = await getIdToken(true);
    if (fresh) res = await doFetch(fresh);
  }

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw Object.assign(new Error(json.error ?? `api-error-${res.status}`), { status: res.status });
  }
  return res.json() as Promise<T>;
}
