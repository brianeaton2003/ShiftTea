'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendPasswordResetEmail, verifyBeforeUpdateEmail } from 'firebase/auth';
import Link from 'next/link';
import { auth } from '@/lib/firebase/firebase';
import { useAuthStore } from '@/lib/firebase/authStore';

type StatusMsg = { type: 'success' | 'error'; message: string };

export default function AccountPage() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const signOut = useAuthStore((s) => s.signOut);
  const router = useRouter();

  const [newEmail, setNewEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<StatusMsg | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<StatusMsg | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login?redirectTo=%2Faccount%2F');
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />;
  }

  const isEmailProvider = user.providerData.some((p) => p.providerId === 'password');
  const providerLabel = user.providerData[0]?.providerId === 'google.com' ? 'Google' : 'Email & Password';

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setEmailLoading(true);
    setEmailStatus(null);
    try {
      await verifyBeforeUpdateEmail(user, newEmail.trim());
      setEmailStatus({ type: 'success', message: `Verification sent to ${newEmail.trim()}.` });
      setNewEmail('');
    } catch {
      setEmailStatus({ type: 'error', message: 'Failed to send verification. Try again.' });
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 lg:max-w-xl">
      <h1 className="text-xl font-bold text-gray-900 lg:text-3xl">Account</h1>
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm lg:rounded-2xl lg:border-black/10 lg:p-8">
        <p className="text-xs text-gray-400">Signed in with</p>
        <p className="text-sm text-gray-700 font-medium mb-3">{providerLabel}</p>
        <p className="text-xs text-gray-400">Email</p>
        <p className="text-sm text-gray-900">{user.email}</p>
        {isEmailProvider && (
          <form onSubmit={handleChangeEmail} className="mt-2 space-y-2">
            <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="New email address" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
            <button type="submit" disabled={emailLoading} className="w-full bg-orange-500 text-white font-semibold py-2.5 rounded-xl text-sm">{emailLoading ? 'Sending…' : 'Change email'}</button>
          </form>
        )}
        {emailStatus && <p className={`text-xs mt-1 ${emailStatus.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{emailStatus.message}</p>}
      </div>
      <Link
        prefetch={false}
        href="/account/reviews/"
        className="block w-full rounded-xl bg-orange-500 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600"
      >
        My Reviews
      </Link>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {isEmailProvider && (
          <button
            type="button"
            onClick={async () => {
              if (!user.email) return;
              setPasswordLoading(true);
              await sendPasswordResetEmail(auth, user.email);
              setPasswordStatus({ type: 'success', message: `Reset link sent to ${user.email}.` });
              setPasswordLoading(false);
            }}
            className="w-full border-b border-gray-200 bg-white py-2.5 text-sm font-semibold text-black transition-colors hover:bg-gray-50"
          >
            {passwordLoading ? 'Sending…' : 'Reset password'}
          </button>
        )}
        <button
          type="button"
          onClick={async () => {
            await signOut();
            router.push('/');
          }}
          className="w-full bg-white py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
        >
          Sign out
        </button>
      </div>
      {passwordStatus && <p className="text-xs text-green-600">{passwordStatus.message}</p>}
    </div>
  );
}
