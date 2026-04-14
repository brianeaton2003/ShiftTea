import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './AuthProvider';

const authState = {
  user: null as
    | {
        uid: string;
        email?: string | null;
        providerData: Array<{ providerId?: string }>;
      }
    | null,
};

const storeState = {
  setUser: vi.fn(),
  setLoading: vi.fn(),
};

const setDocMock = vi.fn();
const docMock = vi.fn((_db: unknown, ...parts: string[]) => ({ path: parts.join('/') }));
const serverTimestampMock = vi.fn(() => 'server-ts');
const getRedirectResultMock = vi.fn(async () => null);

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => docMock(...args),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  serverTimestamp: () => serverTimestampMock(),
}));

vi.mock('firebase/auth', () => ({
  getRedirectResult: (..._args: unknown[]) => getRedirectResultMock(),
  onAuthStateChanged: (_auth: unknown, cb: (user: typeof authState.user) => void) => {
    cb(authState.user);
    return () => {};
  },
}));

vi.mock('@/lib/firebase/firebase', () => ({
  auth: {},
  db: {},
}));

vi.mock('@/lib/firebase/authStore', () => ({
  useAuthStore: () => storeState,
}));

describe('AuthProvider', () => {
  beforeEach(() => {
    authState.user = null;
    storeState.setUser.mockReset();
    storeState.setLoading.mockReset();
    setDocMock.mockReset();
    docMock.mockClear();
    serverTimestampMock.mockClear();
    getRedirectResultMock.mockClear();
  });

  it('syncs user profile and sets auth store when a user is signed in', async () => {
    authState.user = {
      uid: 'uid-1',
      email: 'demo@shifttea.dev',
      providerData: [{ providerId: 'google.com' }],
    };

    render(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>,
    );

    await waitFor(() => expect(setDocMock).toHaveBeenCalled());
    expect(docMock).toHaveBeenCalledWith({}, 'users', 'uid-1');
    expect(storeState.setUser).toHaveBeenCalledWith(authState.user);
    expect(storeState.setLoading).toHaveBeenCalledWith(false);
  });

  it('still finalizes loading when no authenticated user exists', async () => {
    authState.user = null;

    render(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(storeState.setUser).toHaveBeenCalledWith(null);
      expect(storeState.setLoading).toHaveBeenCalledWith(false);
    });
  });
});
