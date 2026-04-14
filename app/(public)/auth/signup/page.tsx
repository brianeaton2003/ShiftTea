'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { useAuthStore } from '@/lib/firebase/authStore';
import Image from 'next/image';

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters.';
  if (!/\d/.test(pw)) return 'Must include at least one number.';
  return null;
}

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') ?? '/';
  const signUp = useAuthStore((s) => s.signUp);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validatePassword(password);
    if (err) {
      setError(err);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await signUp(email, password);
      router.push(redirectTo);
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
      if (code === 'auth/email-already-in-use') setError('That email is already registered.');
      else if (code === 'auth/invalid-email') setError('Enter a valid email address.');
      else if (code === 'auth/weak-password') setError('Choose a stronger password.');
      else setError('Could not create account. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBusy(true);
    setError('');
    try {
      await signInWithGoogle();
      router.push(redirectTo);
    } catch {
      setError('Google sign-in failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const signinHref = `/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`;

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-md flex-col lg:rounded-2xl lg:border lg:border-black/10 lg:bg-white lg:p-8 lg:shadow-sm">
      <div className="mb-4 pt-1 text-center">
        <div className="mb-4 flex justify-center">
          <Image src="/logo.png" alt="ShiftTea logo" width={120} height={32} />
        </div>
        <h1 className="text-xl font-bold text-gray-900 lg:text-2xl">Create a Free Account</h1>
        <p className="mt-1 px-2 text-sm text-gray-500">Your identity will remain 100% anonymous.</p>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={onGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <svg width={18} height={18} viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>
        <form onSubmit={onSubmit} className="space-y-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (8+ chars, include a number)" required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm password" required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400" />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
          >
            {busy ? 'Creating account…' : 'Continue with Email'}
          </button>
        </form>
      </div>

      <p className="text-sm text-center text-gray-500 mt-2 pb-2">
        Already have an account?{' '}
        <Link prefetch={false} href={signinHref} className="font-medium text-orange-500">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] bg-gray-100 rounded-xl animate-pulse" />}>
      <SignUpForm />
    </Suspense>
  );
}
