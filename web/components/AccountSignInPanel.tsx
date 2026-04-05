'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { useAuthStore } from '@/lib/authStore';
import Image from 'next/image';

function mapAuthError(code: string): string {
  if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'Invalid email or password.';
  }
  if (code === 'auth/invalid-email') return 'Enter a valid email address.';
  if (code === 'auth/unauthorized-domain') {
    return 'This domain is not authorized for Google sign-in yet. Please contact support.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Google sign-in is not enabled in Firebase Authentication.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Your browser blocked the sign-in popup. Please allow popups and try again.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Sign-in popup was closed before completing login.';
  }
  return 'Something went wrong. Try again.';
}

function AccountSignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') ?? '/';
  const { signIn, signInWithGoogle } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signIn(email, password);
      router.push(redirectTo);
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
      setError(mapAuthError(code));
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBusy(true);
    setError('');
    try {
      const mode = await signInWithGoogle();
      if (mode === 'popup') {
        router.push(redirectTo);
      }
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
      setError(mapAuthError(code));
    } finally {
      setBusy(false);
    }
  };

  const signupHref = `/account/signup?redirectTo=${encodeURIComponent(redirectTo)}`;

  return (
    <div className="flex min-h-0 flex-col">
      <div className="text-center mb-4 pt-1">
        <div className="flex justify-center mb-3">
          <Image src="/logo.png" alt="ShiftTea logo" width={120} height={32} />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Sign in to your account</h1>
        <p className="text-sm text-gray-500 mt-1 px-2">
          Sign in to continue. New here? You can create an account below. Your identity stays anonymous on every review.
        </p>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={onGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <svg width={18} height={18} viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[var(--background)] px-3 text-xs text-gray-400">or</span>
          </div>
        </div>

        <form onSubmit={onEmail} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm"
          >
            {busy ? 'Signing in…' : 'Continue with Email'}
          </button>
        </form>
      </div>

      <p className="text-xs text-center text-gray-400 mt-4">
        Your reviews are always anonymous. We never share your identity.
      </p>
      <p className="text-xs text-center text-gray-500 mt-2">
        <Link prefetch={false} href="/terms" className="text-orange-500 font-medium hover:text-orange-600">
          See our Terms of Service
        </Link>
      </p>

      <p className="text-sm text-center text-gray-500 mt-2 pb-2">
        No account?{' '}
        <Link prefetch={false} href={signupHref} className="text-orange-500 font-medium">
          Sign up
        </Link>
      </p>
    </div>
  );
}

export function AccountSignInPanel() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] bg-gray-100 rounded-xl animate-pulse" />}>
      <AccountSignInForm />
    </Suspense>
  );
}
