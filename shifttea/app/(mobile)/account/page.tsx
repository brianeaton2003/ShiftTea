'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendPasswordResetEmail, verifyBeforeUpdateEmail } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/authStore';
import { AccountSignInPanel } from '@/components/AccountSignInPanel';

type StatusMsg = { type: 'success' | 'error'; message: string };

export default function AccountPage() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const signOut = useAuthStore((s) => s.signOut);
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPhoneForm, setShowPhoneForm] = useState(false);

  const [emailStatus, setEmailStatus] = useState<StatusMsg | null>(null);
  const [phoneStatus, setPhoneStatus] = useState<StatusMsg | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<StatusMsg | null>(null);

  const [emailLoading, setEmailLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists()) setPhone(snap.data().phone ?? '');
    });
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-100 rounded animate-pulse w-32" />
        <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return <AccountSignInPanel />;
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
      setEmailStatus({
        type: 'success',
        message: `Verification sent to ${newEmail.trim()}. Click the link in that email to confirm the change.`,
      });
      setNewEmail('');
      setShowEmailForm(false);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      setEmailStatus({
        type: 'error',
        message:
          code === 'auth/requires-recent-login'
            ? 'Sign out and sign back in before changing your email.'
            : code === 'auth/email-already-in-use'
              ? 'That email is already in use.'
              : 'Failed to send verification. Try again.',
      });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleChangePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim()) return;
    setPhoneLoading(true);
    setPhoneStatus(null);
    try {
      await updateDoc(doc(db, 'users', user.uid), { phone: newPhone.trim() });
      setPhone(newPhone.trim());
      setPhoneStatus({ type: 'success', message: 'Phone number updated.' });
      setNewPhone('');
      setShowPhoneForm(false);
    } catch {
      setPhoneStatus({ type: 'error', message: 'Failed to update phone number. Try again.' });
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user.email) return;
    setPasswordLoading(true);
    setPasswordStatus(null);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setPasswordStatus({ type: 'success', message: `Reset link sent to ${user.email}.` });
    } catch {
      setPasswordStatus({ type: 'error', message: 'Failed to send reset email. Try again.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Back to home"
        >
          <svg width={20} height={20} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">Account</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Signed in with</p>
          <p className="text-sm text-gray-700 font-medium">{providerLabel}</p>
        </div>

        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Email address</p>
            {isEmailProvider && (
              <button
                type="button"
                onClick={() => {
                  setShowEmailForm((v) => !v);
                  setEmailStatus(null);
                }}
                className="text-xs text-orange-500 font-medium hover:text-orange-600 transition-colors"
              >
                {showEmailForm ? 'Cancel' : 'Change'}
              </button>
            )}
          </div>
          <p className="text-sm text-gray-900">{user.email}</p>
          {emailStatus && (
            <p className={`text-xs mt-1.5 leading-snug ${emailStatus.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
              {emailStatus.message}
            </p>
          )}
          {showEmailForm && (
            <form onSubmit={handleChangeEmail} className="mt-3 space-y-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="New email address"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <button
                type="submit"
                disabled={emailLoading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 text-sm"
              >
                {emailLoading ? 'Sending…' : 'Send verification email'}
              </button>
            </form>
          )}
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Phone number</p>
            <button
              type="button"
              onClick={() => {
                setShowPhoneForm((v) => !v);
                setPhoneStatus(null);
              }}
              className="text-xs text-orange-500 font-medium hover:text-orange-600 transition-colors"
            >
              {showPhoneForm ? 'Cancel' : phone ? 'Change' : 'Add'}
            </button>
          </div>
          <p className="text-sm text-gray-900">{phone || <span className="text-gray-400">Not set</span>}</p>
          {phoneStatus && (
            <p className={`text-xs mt-1.5 ${phoneStatus.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
              {phoneStatus.message}
            </p>
          )}
          {showPhoneForm && (
            <form onSubmit={handleChangePhone} className="mt-3 space-y-2">
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="e.g. (856) 555-0100"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <button
                type="submit"
                disabled={phoneLoading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 text-sm"
              >
                {phoneLoading ? 'Saving…' : 'Save phone number'}
              </button>
            </form>
          )}
        </div>
      </div>

      <Link
        prefetch={false}
        href="/account/reviews"
        className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4 hover:border-orange-200 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
            <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="#f97316">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900 text-sm">My Reviews</span>
        </div>
        <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-gray-400">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>

      {isEmailProvider && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4">
          <p className="text-sm font-semibold text-gray-900 mb-0.5">Password</p>
          <p className="text-xs text-gray-400 mb-3">A reset link will be sent to {user.email}</p>
          {passwordStatus && (
            <p className={`text-xs mb-3 leading-snug ${passwordStatus.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
              {passwordStatus.message}
            </p>
          )}
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={passwordLoading}
            className="w-full border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
          >
            {passwordLoading ? 'Sending…' : 'Reset password'}
          </button>
        </div>
      )}

      <div className="text-center">
        <Link prefetch={false} href="/terms" className="text-sm text-orange-500 font-medium hover:text-orange-600">
          See our Terms of Service
        </Link>
      </div>

      <button
        type="button"
        onClick={async () => {
          await signOut();
          router.push('/');
        }}
        className="w-full text-sm text-red-500 font-medium py-3 hover:text-red-600 transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
