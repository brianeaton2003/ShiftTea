'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendPasswordResetEmail, verifyBeforeUpdateEmail } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase/firebase';
import { useAuthStore } from '@/lib/firebase/authStore';

type StatusMsg = { type: 'success' | 'error'; message: string };

export default function AccountPage() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const signOut = useAuthStore((s) => s.signOut);
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const [emailStatus, setEmailStatus] = useState<StatusMsg | null>(null);
  const [phoneStatus, setPhoneStatus] = useState<StatusMsg | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<StatusMsg | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login?redirectTo=%2Faccount%2F');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists()) setPhone(snap.data().phone ?? '');
    });
  }, [user]);

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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Account</h1>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
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
        <div className="mt-4">
          <p className="text-xs text-gray-400">Phone</p>
          <p className="text-sm text-gray-900">{phone || 'Not set'}</p>
          <button type="button" onClick={() => setShowPhoneForm((v) => !v)} className="text-xs text-orange-500 mt-1">{showPhoneForm ? 'Cancel' : 'Edit phone'}</button>
          {showPhoneForm && (
            <form onSubmit={handleChangePhone} className="mt-2 space-y-2">
              <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Phone number" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
              <button type="submit" disabled={phoneLoading} className="w-full bg-orange-500 text-white font-semibold py-2.5 rounded-xl text-sm">{phoneLoading ? 'Saving…' : 'Save phone'}</button>
            </form>
          )}
          {phoneStatus && <p className={`text-xs mt-1 ${phoneStatus.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{phoneStatus.message}</p>}
        </div>
      </div>
      <Link prefetch={false} href="/account/reviews/" className="block text-sm text-orange-500 font-medium">My Reviews</Link>
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
          className="w-full border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-sm"
        >
          {passwordLoading ? 'Sending…' : 'Reset password'}
        </button>
      )}
      {passwordStatus && <p className="text-xs text-green-600">{passwordStatus.message}</p>}
      <button
        type="button"
        onClick={async () => {
          await signOut();
          router.push('/');
        }}
        className="w-full text-sm text-red-500 font-medium py-3"
      >
        Sign out
      </button>
    </div>
  );
}
