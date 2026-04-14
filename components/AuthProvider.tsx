'use client';

import { getRedirectResult, onAuthStateChanged } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useEffect } from 'react';
import { auth, db } from '@/lib/firebase/firebase';
import { useAuthStore } from '@/lib/firebase/authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    let active = true;

    // Explicitly finalize redirect-based auth flows on app start.
    // This improves reliability on mobile/Safari where popup auth is often blocked.
    getRedirectResult(auth)
      .then(async (result) => {
        const redirectUser = result?.user;
        if (!active || !redirectUser) return;
        await setDoc(
          doc(db, 'users', redirectUser.uid),
          {
            uid: redirectUser.uid,
            email: redirectUser.email ?? '',
            auth_provider: 'google',
            last_seen_at: serverTimestamp(),
          },
          { merge: true },
        );
      })
      .catch(() => {
        // onAuthStateChanged below still governs session state.
      });

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!active) return;

      if (user) {
        const providerId = user.providerData[0]?.providerId ?? 'unknown';
        const authProvider =
          providerId === 'google.com'
            ? 'google'
            : providerId === 'password'
              ? 'email'
              : providerId;
        try {
          await setDoc(
            doc(db, 'users', user.uid),
            {
              uid: user.uid,
              email: user.email ?? '',
              auth_provider: authProvider,
              last_seen_at: serverTimestamp(),
            },
            { merge: true },
          );
        } catch {
          // Keep session state even if profile sync fails transiently.
        }
      }

      setUser(user);
      setLoading(false);
    });

    return () => {
      active = false;
      unsub();
    };
  }, [setUser, setLoading]);

  return <div className="flex min-h-full w-full flex-1 flex-col">{children}</div>;
}
