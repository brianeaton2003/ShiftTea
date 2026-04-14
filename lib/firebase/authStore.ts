'use client';

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { create } from 'zustand';
import { auth, db } from './firebase';

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<'popup' | 'redirect'>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  signUp: async (email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      email: cred.user.email ?? email.trim(),
      auth_provider: 'email',
      created_at: serverTimestamp(),
      review_count: 0,
      my_reviews: [],
    });
  },
  signIn: async (email, password) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  },
  signInWithGoogle: async () => {
    const provider = new GoogleAuthProvider();
    try {
      const cred = await signInWithPopup(auth, provider);
      await setDoc(
        doc(db, 'users', cred.user.uid),
        {
          uid: cred.user.uid,
          email: cred.user.email ?? '',
          auth_provider: 'google',
          last_seen_at: serverTimestamp(),
        },
        { merge: true },
      );
      return 'popup';
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code ?? '') : '';
      const shouldFallbackToRedirect =
        code === 'auth/popup-blocked' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/operation-not-supported-in-this-environment';
      if (!shouldFallbackToRedirect) {
        throw err;
      }
      await signInWithRedirect(auth, provider);
      return 'redirect';
    }
  },
  signOut: async () => {
    await firebaseSignOut(auth);
  },
}));
