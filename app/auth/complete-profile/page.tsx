'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type PendingInfo = { email: string; name: string; role: 'DOCTOR' | 'PHARMACIST' };

export default function CompleteProfilePage() {
  const router = useRouter();
  const [pending, setPending] = useState<PendingInfo | null>(null);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [specialization, setSpecialization] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [qualifications, setQualifications] = useState('');

  useEffect(() => {
    fetch('/api/auth/google/pending')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load your Google sign-up.');
        setPending(data.data);
      })
      .catch((err) => setLoadError(err.message));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);
    try {
      const body: Record<string, string> =
        pending?.role === 'DOCTOR'
          ? { specialization, licenseNumber, phone }
          : { licenseNumber, phone, qualifications };

      const res = await fetch('/api/auth/google/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'Something went wrong. Please try again.');
        return;
      }
      router.push(pending?.role === 'DOCTOR' ? '/doctor' : '/pharmacist');
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-sm text-center">
          <p style={{ color: '#EF4444', fontSize: '0.9rem' }}>{loadError}</p>
          <Button className="mt-4" onClick={() => router.push('/auth')}>Back to sign in</Button>
        </div>
      </div>
    );
  }

  if (!pending) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F8FAFC' }}>
        <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F8FAFC' }}>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 max-w-md w-full shadow-sm space-y-4">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1A1A2E' }}>Complete your profile</h2>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '0.25rem' }}>
            Signed in as <strong>{pending.name}</strong> ({pending.email}). Just need a few more details to finish setting up your {pending.role === 'DOCTOR' ? 'doctor' : 'pharmacist'} account.
          </p>
        </div>

        {pending.role === 'DOCTOR' && (
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.375rem' }}>Specialization</label>
            <Input value={specialization} onChange={(e) => setSpecialization(e.target.value)} placeholder="e.g. Cardiology" required />
          </div>
        )}

        {pending.role === 'PHARMACIST' && (
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.375rem' }}>Qualifications</label>
            <Input value={qualifications} onChange={(e) => setQualifications(e.target.value)} placeholder="e.g. Pharm.D" required />
          </div>
        )}

        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.375rem' }}>License Number</label>
          <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="License / registration number" required />
        </div>

        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.375rem' }}>Phone Number</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" required />
        </div>

        {submitError && <p style={{ color: '#EF4444', fontSize: '0.8rem' }}>{submitError}</p>}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Finish sign up'}
        </Button>
      </form>
    </div>
  );
}
